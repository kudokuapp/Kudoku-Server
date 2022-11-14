import { extendType, idArg, nonNull, stringArg } from "nexus";

export const LinkQuery = extendType({
	type: "Query",
	definition(t) {
		t.nonNull.list.nonNull.field("getalluser", {
			type: "User",
			description:
				"This API is to get every user's data in our database. Useful for checking if username is already taken or not.",
			resolve(parent, args, context, info) {
				return context.prisma.user.findMany();
			},
		});

		t.field("getuserbyid", {
			type: "User",
			description: "This API is to get a spesific user's data by their id",
			args: {
				id: nonNull(idArg()),
			},
			resolve(parent, args, context) {
				const { id } = args;

				return context.prisma.user.findFirst({
					where: { id },
				});
			},
		});

		t.field("getuserbyusername", {
			type: "User",
			description:
				"This API is to get a spesific user's data by their username.",
			args: {
				username: nonNull(stringArg()),
			},
			resolve(parent, args, context) {
				const { username } = args;

				return context.prisma.user.findFirst({
					where: { username },
				});
			},
		});
	},
});
