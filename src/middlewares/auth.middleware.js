import { Apierror } from "../utils/Apierror.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler(async(req,res,next)=>{
     try {
         const token = req.cookies?.accessToken || req.header
         ("Authorization")?.replace("Bearer","")
   
         if(!token){
           throw new Apierror(401,"Unauthorized access")
         }
   
         const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
   
         const user = await User.findById(decodedToken?._id).select("-refreshToken -password")
   
         if(!user){
           throw new Apierror(401,"Invalid Token")
         }
         
         req.user = user
         next()
     } catch (error) {
        throw new Apierror(401,error?.message || "Invalid Token")
     }
})