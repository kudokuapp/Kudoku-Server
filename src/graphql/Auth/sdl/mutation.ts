import { arg, extendType, idArg, nonNull, stringArg } from "nexus";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { APP_SECRET } from "../../../utils/auth";
import axios from "axios";
import { User } from "@prisma/client";

export const AuthMutation = extendType({
	type: "Mutation",
	definition(t) {
		t.nonNull.field("signup", {
			type: "AuthPayLoad",
			description:
				"This is the API where user can sign up after they got invited. This means that the user's data is already in our MongoDB database.",
			args: {
				id: nonNull(idArg()),
				username: nonNull(stringArg()),
				password: nonNull(stringArg()),
			},

			async resolve(parent, args, context) {
				const { username, id } = args;
				const password = await bcrypt.hash(args.password, 10);

				const searchUser = await context.prisma.user.findFirst({
					where: { id },
				});

				if (!searchUser) {
					throw new Error("User have not registered through kudoku.id");
				}

				const user = await context.prisma.user.update({
					where: { id },
					data: { username, password },
				});

				const token = jwt.sign({ userId: user.id }, APP_SECRET);

				return {
					token,
					user,
				};
			},
		});

		t.nonNull.field("login", {
			type: "AuthPayLoad",
			args: {
				username: nonNull(stringArg()),
				password: nonNull(stringArg()),
			},

			async resolve(parent, args, context) {
				const { username } = args;
				const user = await context.prisma.user.findUnique({
					where: { username },
				});

				if (!user) {
					throw new Error("No such user found");
				}

				const valid = await bcrypt.compare(args.password, user.password);

				if (!valid) {
					throw new Error("Invalid password");
				}

				const token = jwt.sign({ userId: user.id }, APP_SECRET);

				return {
					token,
					user,
				};
			},
		});

		t.nonNull.field("getTokenFromOtp", {
			type: "AuthPayLoad",
			description:
				'Get JWT Token from email/whatsapp OTP that has been requested from the client. We then verified the OTP in this server. WhatsApp needs to have "+62" prefix.',
			args: {
				email: arg({
					type: "String",
					description:
						'Fill this with user email if you want to verify the OTP via the EMAIL OTP, otherwise fill this with "null"',
				}),
				whatsapp: arg({
					type: "String",
					description:
						'Fill this with user phone number if you want to verify the OTP via the SMS OTP, otherwise fill this with "null"',
				}),
				otp: nonNull(stringArg()), // String since OTP can start with the number 0
			},

			async resolve(parent, args, context) {
				const { email, otp, whatsapp } = args;
				let valid: boolean;
				let user: User;

				const url = "https://app.kudoku.id/api/verify/confirmcode";

				if (email === null && whatsapp === null)
					throw new Error("Cannot have both email and whatsapp null");

				if (email !== null && email !== undefined) {
					const userData = await context.prisma.user.findUnique({
						where: { email },
					});
					if (!userData) {
						throw new Error("User is not found!");
					} else {
						user = userData;
					}

					const { data } = await axios.post(url, {
						receiver: email,
						code: otp,
					});

					if (!data || Object.keys(data).length === 0)
						throw new Error("Server error");

					valid = data.valid;

					if (!valid) throw new Error("Wrong OTP");
				} else {
					if (whatsapp === null || whatsapp === undefined)
						throw new Error(
							"Cannot have whatsapp null or undefined after having email is null or underfined"
						);

					const userData = await context.prisma.user.findUnique({
						where: { whatsapp },
					});

					if (!userData) {
						throw new Error("User is not found!");
					} else {
						user = userData;
					}

					const { data } = await axios.post(url, {
						receiver: whatsapp,
						code: otp,
					});

					if (!data || Object.keys(data).length === 0)
						throw new Error("Server error");

					valid = data.valid;

					if (!valid) throw new Error("Wrong OTP");
				}

				const token = jwt.sign({ userId: user!.id }, APP_SECRET, {
					expiresIn: "15m",
				});

				return {
					token,
					user,
				};
			},
		});

		t.nonNull.field("changePassword", {
			type: "AuthPayLoad",
			description:
				"Change the user password. Must have JWT Token from running mutation `getTokenFromOtp`",
			args: {
				password: nonNull(stringArg()),
			},

			async resolve(parent, args, context) {
				const { userId: id } = context;

				if (!id) {
					throw new Error("Invalid token");
				}

				const password = await bcrypt.hash(args.password, 10);

				const user = await context.prisma.user.update({
					where: { id },
					data: { password },
				});

				if (!user) {
					throw new Error("Cannot find user!");
				}

				const token = jwt.sign({ userId: user.id }, APP_SECRET);

				return {
					token,
					user,
				};
			},
		});
	},
});
