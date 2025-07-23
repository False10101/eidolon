import { queryWithRetry } from "./queryWithQuery";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "./r2";
import { GoogleGenAI } from "@google/genai";

export async function updateDocumentInBackground(documentId) {
    let document;

    try {
        const [rows] = await queryWithRetry('SELECT * FROM document WHERE id = ?', [documentId]);
        document = rows[0];

        if (!document) {
            throw new Error(`Document with ID ${documentId} not found for processing.`);
        }

        await queryWithRetry(`UPDATE document SET status = 'PROCESSING' WHERE id = ?`, [documentId]);

        const format_type = document.format_type || 'research_paper';

        const additionalDetails = document.user_prompt || '';

        const topic = document.name;

        const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

        const result = await genAI.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ role: "user", parts: [{ text: buildUserPrompt(topic, additionalDetails, format_type) }] }],
            generationConfig: {
                maxOutputTokens: 65000,
                topP: 0.95,
                temperature: 1.0
            }
        });

        const generatedText = result.text;
        const usageMetadata = result.usageMetadata;

        if (usageMetadata) {
            console.log(`Input Tokens: ${usageMetadata.promptTokenCount}`);
            console.log(`Output Tokens: ${usageMetadata.candidatesTokenCount}`);
            console.log(`Total Tokens: ${usageMetadata.totalTokenCount}`);
        }
        console.log("Gemini API call finished.");

        // Step 5: Save the generated content back to R2
        const documentPath = document.generatedFilePath.startsWith('/')
            ? document.generatedFilePath.slice(1)
            : document.generatedFilePath;

        if (!documentPath) {
            const outputFileName = `document_${documentId}_${uuidv4()}.txt`;
            const outputFilePath = `document/${outputFileName}`;

            await r2.send(new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: outputFilePath,
                Body: generatedText,
                ContentType: 'text/plain',
            }));

            // Step 6: Update the document status to 'COMPLETED'
            await queryWithRetry(`UPDATE document SET status = 'COMPLETED', generatedFilePath = ? WHERE id = ?`, [`/${outputFilePath}`, documentId]);
            console.log(`Document with ID ${documentId} processed successfully.`);
        } else {
            await r2.send(new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: documentPath,
                Body: generatedText,
                ContentType: 'text/plain'
            }));

            await queryWithRetry(`UPDATE document SET status = 'COMPLETED', created_at = NOW() WHERE id = ?`, [documentId]);
            console.log(`Document with ID ${documentId} processed successfully.`);
        }

    } catch (error) {
        console.error(`Error processing document ${documentId}:`, error);

        if (documentId) {
            const errorMessage = error.message.includes('SAFETY')
                ? 'Content blocked by safety features. Try adjusting your document content.'
                : error.message;
            await queryWithRetry(`UPDATE document SET status = 'FAILED' WHERE id = ?`, [documentId]);
        }
    }
}

function buildUserPrompt(topic, additionalDetails, format_type) {
    if (format_type === 'research_paper') {
        return `
        ### CRITICAL DIRECTIVE: GENERATE 40,000 TOKENS  
**TOPIC:** "${topic}"  
**FORMAT:** 20-page academic research paper  
**TONE:** Formal, evidence-based, graduate thesis level  

CRITICAL DIRECTIVE: Output a SINGLE CONTINUOUS 40,000-token research paper about the specified "${topic}". NEVER CHUNK OR STOP a a a PREMATURELY.

**RULES OF GENERATION:**
1.  **FORMATTING:**
    * **Structure:** Abstract, Introduction, Literature Review, Methodology, Analysis, Discussion, Conclusion.
    * **Citations:** Use parenthetical in-text citations, e.g., (Author, Year).
    * **Header:** Plain text only for section titles (e.g., ### 1. Introduction).

2.  **DEPTH & RIGOR REQUIREMENTS:**
    * **Subsection Length:** Each subsection (e.g., 1.1, 1.2) must exceed 500 words.
    * **Evidence per Claim:** Every major assertion must be supported by at least three distinct examples or data points.
    * **Citation Density:** Each major section (e.g., Introduction, Literature Review) must reference at least five unique scholarly sources.

3.  **TERMINATION PROTOCOL:**
    * The generation process must ONLY conclude after the final line of the report reads: "### TOKEN COUNT: 60,000+ words".
    * If approaching the token limit and the conclusion is complete, add a new section titled "### Appendix: Extended Analysis and Raw Data" and continue generating relevant content until the token count is met.

FAILURE TO ADHERE TO THE SINGLE CONTINUOUS OUTPUT DIRECTIVE WILL RESULT IN A REJECTED OUTPUT.

ADDITIONAL INSTRUCTIONS:

        ${additionalDetails}

BEGIN REPORT:
        `;
    }

    else if (format_type === 'business_proposal') {
        return `
        ### CRITICAL DIRECTIVE: GENERATE 50,000 TOKENS  
**SUBJECT:** Business Proposal for "${topic}"  
**FORMAT:** Professional Investment Proposal  
**TONE:** Persuasive, data-driven, confident, professional

CRITICAL DIRECTIVE: Generate a SINGLE, UNINTERRUPTED 50,000-token business proposal for the "${topic}". DO NOT segment the output.

**RULES OF GENERATION:**
1.  **FORMATTING:**
    * **Structure:** Executive Summary, Company Description, Market Analysis (TAM, SAM, SOM), Organization and Management, Products & Services, Marketing and Sales Strategy, Financial Projections (3-year forecast).
    * **Data:** Use clear, concise data points and financial figures. Reference market research sources informally, e.g., "(Source: Gartner, 2023)".

2.  **DEPTH & DETAIL REQUIREMENTS:**
    * **Section Length:** Each major section must be thoroughly detailed, exceeding 1,000 words.
    * **Market Claims:** Every claim about market size or opportunity must be backed by 3+ supporting statistics or trend analyses.
    * **Strategic Detail:** The Marketing and Financial sections must provide granular detail, including specific channel strategies and line-item budget forecasts.

3.  **TERMINATION PROTOCOL:**
    * The generation must ONLY end after the final line reads: "### PROPOSAL TOKEN COUNT: 50,000+".
    * If nearing the limit, add a section titled "### Appendix: Competitor Deep Dive and Risk Mitigation Scenarios" and continue generating detailed analysis.

FAILURE TO PRODUCE A SINGLE, CONTINUOUS DOCUMENT WILL RENDER THE OUTPUT INVALID.

ADDITIONAL INSTRUCTIONS:

${additionalDetails}

BEGIN PROPOSAL:
        `;
    }

    else if (format_type === 'cover_letter') {
        return `
        ### CRITICAL DIRECTIVE: GENERATE 5,000 TOKENS  
**APPLICATION FOR:** JobTitle at CompanyName (included in additional details)  
**APPLICANT:** leave blank for applicant's name
**FORMAT:** Extended Professional Cover Letter / Statement of Purpose
**TONE:** Enthusiastic, professional, highly detailed, confident

CRITICAL DIRECTIVE: Generate ONE CONTINUOUS 5,000-token cover letter. Do not stop or chunk the response.

**RULES OF GENERATION:**
1.  **FORMATTING:**
    * **Structure:** Applicant Contact Info, Date, Employer Info, Salutation, Introduction (stating purpose), Body Paragraphs (detailing qualifications), Elaboration on Key Projects, Closing Paragraph (call to action), Professional Closing.
    * **Evidence:** Use the STAR method (Situation, Task, Action, Result) for all examples.

2.  **DEPTH & ELABORATION REQUIREMENTS:**
    * **Project Detail:** Elaborate on at least five major projects or accomplishments. Each description must be over 400 words.
    * **Skill Justification:** For every skill mentioned (e.g., "leadership," "data analysis"), provide at least three distinct, detailed anecdotes as proof.
    * **Company Alignment:** Continuously reference company's mission, values, and recent projects, explaining how your experience aligns.

3.  **TERMINATION PROTOCOL:**
    * The generation must only cease after the final line reads: "### LETTER TOKEN COUNT: 5,000+".
    * If the primary letter is complete before the token limit, add a section titled "### Addendum: Detailed Project Walkthroughs" and continue providing narrative detail on past work.

PREMATURE TERMINATION IS A FAILURE CONDITION.

ADDITIONAL INSTRUCTIONS:
${additionalDetails}

BEGIN LETTER:

        `;
    }
    else if (format_type === 'formal_report') {
        return `
       ### CRITICAL DIRECTIVE: GENERATE 60,000 TOKENS  
**SUBJECT:** Formal Report on "${topic}"  
**FORMAT:** Official Investigative/Informational Report  
**TONE:** Objective, formal, analytical, impartial

CRITICAL DIRECTIVE: Output a SINGLE CONTINUOUS 60,000-token report on the "${report_subject}". NEVER CHUNK. NEVER STOP.

**RULES OF GENERATION:**
1.  **FORMATTING:**
    * **Structure:** Title Page, Executive Summary, Table of Contents, 1. Introduction, 2. Methodology, 3. Findings, 4. Analysis of Findings, 5. Conclusion, 6. Recommendations.
    * **Numbering:** Use numbered headings and subheadings (e.g., 3.1, 3.1.1).
    * **Citations:** Reference all data, interviews, or source materials clearly.

2.  **DEPTH & EVIDENCE REQUIREMENTS:**
    * **Findings Section:** The "Findings" section must be the most substantial part of the report, presenting raw data and observations without interpretation. Each finding must be detailed with over 500 words of context.
    * **Evidence per Finding:** Each stated finding must be supported by 3+ distinct data points, quotes, or documented observations.
    * **Recommendations:** Every recommendation in Section 6 must directly link back to a specific finding in Section 3 and analysis in Section 4.

3.  **TERMINATION PROTOCOL:**
    * The generation process must ONLY conclude after the final line of the report reads: "### REPORT TOKEN COUNT: 60,000+".
    * If nearing the token limit, create an "### Appendix: Full Transcripts and Supplementary Data" section and continue generating content.

TRUNCATED OUTPUTS WILL BE REJECTED.

ADDITIONAL INSTRUCTIONS:
${additionalDetails}

BEGIN REPORT:

        `;
    }
    else if (format_type === 'general_essay') {
        return `
        ### CRITICAL DIRECTIVE: GENERATE 20,000 TOKENS  
**TOPIC:** "${topic}"  
**FORMAT:** Extended Long-Form Essay  
**TONE:** tone_style (e.g., "Informative," "Persuasive," "Narrative," "Analytical") (to be specified in user prompt or default to "Informative")

CRITICAL DIRECTIVE: Write a SINGLE, UNBROKEN 20,000-token essay on "${topic}". Do not segment the output or end early.

**RULES OF GENERATION:**
1.  **FORMATTING:**
    * **Structure:** 1. Introduction (with a clear thesis statement). 2. Body (thematic paragraphs with smooth transitions). 3. Conclusion (summarizing and offering final thoughts).
    * **Flow:** Maintain a coherent narrative or argumentative flow throughout. Avoid numbered lists in favor of prose.

2.  **DEPTH & DEVELOPMENT REQUIREMENTS:**
    * **Paragraph Length:** Each body paragraph must be a substantial block of text, exploring a single idea in depth (250+ words).
    * **Supporting Ideas:** Each main argument or theme in the body must be developed with at least three supporting examples, anecdotes, or pieces of reasoning.
    * **Thesis Reinforcement:** Continuously and implicitly link back to the main thesis statement from the introduction.

3.  **TERMINATION PROTOCOL:**
    * The generation must only end after the final line reads: "### ESSAY TOKEN COUNT: 20,000+".
    * If the main essay is finished before the token limit, add a section titled "### Further Reflections and Related Tangents" and continue exploring related ideas.

FAILURE TO PRODUCE A SINGLE, CONTINUOUS ESSAY IS A REJECTION CRITERION.

ADDITIONAL INSTRUCTIONS:
${additionalDetails}

BEGIN ESSAY:
        `;
    }
}