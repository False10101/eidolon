export default function login (){
    return (
        <div className="flex flex-col w-full h-[93%] rounded-none " style={{ backgroundImage: "url('/authbg.png')", backgroundSize: "cover" }}>
           <div className="flex flex-col h-max my-auto mx-[15.5%] w-full space-y-6">
                <h1 className="text-7xl font-semibold text-shadow-[#4efcf7] text-shadow-[0_0px_31px_rgb(78_252_247_/_1)] mb-16">Sign Up</h1>
                <input placeholder="Username..." className="w-[40%] p-4 px-8 border-[1px] border-[#0E5E97] bg-[#333E57]/[22%] text-xl text-[#959694] rounded-md hover:bg-[#243357]"/>
                <input type="password" placeholder="Password..." className="w-[40%] p-4 px-8 border-[1px] border-[#0E5E97] bg-[#333E57]/[22%] text-xl text-[#959694] rounded-md hover:bg-[#243357]"/>
                <input placeholder="Username..." className="w-[40%] p-4 px-8 border-[1px] border-[#0E5E97] bg-[#333E57]/[22%] text-xl text-[#959694] rounded-md hover:bg-[#243357]"/>
                <input type="password" placeholder="Password..." className="w-[40%] p-4 px-8 border-[1px] border-[#0E5E97] bg-[#333E57]/[22%] text-xl text-[#959694] rounded-md hover:bg-[#243357] mb-12"/>
                <div className="flex flex-row w-[40%] ">
                    <button className="flex px-10 py-4 rounded-md bg-[#00BFFF] w-max text-xl hover:bg-[#A3E8FF] hover:text-[#0B1143]">Log In</button>
                    <button className="flex ml-auto my-auto text-[#959694] w-max ">Dont have an account? <span className="underline ml-1 text-[#00BFFF]">Sign up</span></button>
                </div>
           </div>
        </div>
    )
}