import { extendType, idArg, nonNull, stringArg } from "nexus";

export const LinkQuery = extendType({
	type: "Query",
	definition(t) {
		t.nonNull.list.nonNull.field("getalluser", {
			type: "User",
			resolve(parent, args, context, info) {
				return context.prisma.user.findMany();
			},
		});

		t.field("getuserbyid", {
			type: "User",
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
