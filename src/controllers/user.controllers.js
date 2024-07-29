import { asyncHandler } from "../utils/asyncHandler.js";
import {Apierror} from "../utils/Apierror.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js"


const gernrateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generatesAccessToken()
        const refreshToken = user.generatesRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave : false})

        return {accessToken,refreshToken}

    } catch (error) {
      throw new Apierror(500,"Something went wrong while geneating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req,res) =>{
  // get user details from frontend
  // validation - not empty
  // check if user already exists : username , email
  // check for images , check for avatar
  // upload them to cloudinary , avatar
  // create user object - create new entry in db
  // remove password and refresh token field from response 
  // check for user creation
  // return response

  const {fullname , email, username,password} = req.body
  console.log("email:",email);

  if(
    [fullname,email,username,password].some((field)=>field?.trim()==="")
  ){
      throw new Apierror(400,"All fields are required")
  }
 
  const existedUser = await User.findOne({
    $or:[{ username } , { email }]
  })

  if(existedUser){
    throw new Apierror(409,"User with email and username already exist")
  }

   const avatarLocalPath = req.files?.avatar[0]?.path;
//    const coverImageLocalPath = req.files?.coverImage[0]?.path;

   let coverImageLocalPath;
   if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
   }

   if(!avatarLocalPath){
    throw new Apierror(400,"avatar file is required")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(!avatar){
    throw new Apierror(400,"avatar file is required")
   }

   const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
   })

   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )

   if(!createdUser){
     throw new Apierror(500,"Something went wrong while registering the user")
   }

   return res.status(201).json(
    new ApiResponse(200,createdUser,"User registered successfully")
   )

})

const loginUser = asyncHandler(async (req,res)=>{
     // req body -> data
     // username or email
     // find the user
     // password check
     // access and refresh token
     // send cookie

     const {email,username,password} = req.body
     if(!username && !email){
      throw new Apierror (400,"username or email is required")
     }

     const user = await User.findOne({
      $or: [{username} , {email}]
     })

     if(!user){
      throw new Apierror(404 ,"User does not exist")
     }

     const isPasswordValid = await user.isPasswordCorrect(password)

     if(!isPasswordValid){
      throw new Apierror(401,"Invalid user credential")
     }
    
    const {accessToken,refreshToken} = await gernrateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password - refreshToken")

    const options = {
      httpOnly:true,
      secure:true
    }

    return res
    .status(200)
    .cookie("accessToken" , accessToken ,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
      new ApiResponse(
        200,
        {
          user:loggedInUser,accessToken,refreshToken
        },
        "User logged in successfully"
      )
    )
})

const logoutUser = asyncHandler(async(req,res) =>{
     await User.findByIdAndUpdate(
        req.user._id,
        {
          $set:{
            refreshToken:undefined
          }
        },
        {
          new:true
        }
      )

      const options = {
        httpOnly:true,
        secure:true
      }

      return res
      .status(200)
      .clearCookie("accessToken ",options)
      .clearCookie("refreshToken",options)
      .json(new ApiResponse(200,{},"User logged out"))
})

export { registerUser , loginUser ,logoutUser}