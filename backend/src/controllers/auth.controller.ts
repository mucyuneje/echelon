import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { AppError } from "../middleware/error.middleware";

function signToken(id: string): string {
  return jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
}

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw new AppError("Name, email, and password are required", 400);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("Email already registered", 409);
  }

  const user = await User.create({ name, email, password, role: role || "recruiter" });
  const token = signToken(user._id.toString());

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: { user, token },
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = signToken(user._id.toString());

  res.json({
    success: true,
    message: "Login successful",
    data: { user, token },
  });
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  res.json({ success: true, data: req.user });
};
