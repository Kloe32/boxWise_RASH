// import {User} from "../model/user.model.js"
import User from "../repositories/user.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createNewUser = asyncHandler(async (req, res) => {
  const { username, email } = req.body;

  if (!username || !email) {
    throw new ApiError(404, "No Credential Provided!", []);
  }
  const existedUser = await User.getUserByEmail(email);
  if (existedUser) {
    throw new ApiError(409, "User Already Existed", []);
  }

  const user = await User.create(username, email);
  if (!user) {
    throw new ApiError(500, "There is something wrong registering user.", []);
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { userId: user.insertId },
        "User Successfully Registered!"
      )
    );
});

const registerUser = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const existedUser = await User.findOne({ email });
  if (existedUser) {
    throw new ApiError(409, "User already existed with the same email.", []);
  }

  const user = await User.create(req.body);
  if (!user) {
    throw new ApiError(500, "There is something wrong registering user.", []);
  }

  return res
    .status(201)
    .json(new ApiResponse(200, user, "User Successfully Registered!"));
});

const getAllUser = asyncHandler(async (req, res) => {
  const users = await User.find({});
  if (!users) {
    throw new ApiError(404, "There isn't any user data.");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, users, "Users Successfully fetched!"));
});

const updateUser = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const update = req.body;

  if (update.email) {
    const emailOwner = await User.findOne({ email: update.email });
    if (emailOwner && emailOwner._id.toString() !== id) {
      throw new ApiError(409, "User already existed with the same email.", []);
    }
  }
  const updatedUser = await User.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });
  if (!updatedUser) {
    throw new ApiError(404, "There is no user with this id.", []);
  }
  return res
    .status(202)
    .json(new ApiResponse(200, updateUser, "Users Successfully Updated!"));
});

export { registerUser, getAllUser, updateUser, createNewUser };
