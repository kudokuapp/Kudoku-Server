import { extendType, idArg, nonNull, stringArg } from "nexus";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { APP_SECRET } from "../../../utils/auth";

export const AuthMutation = extendType({
	type: "Mutation",
	definition(t) {
		t.nonNull.field("signup", {
			type: "AuthPayLoad",
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
	},
});
