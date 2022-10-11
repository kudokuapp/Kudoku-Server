import { objectType } from "nexus";

export const AuthPayLoad = objectType({
	name: "AuthPayLoad",
	definition(t) {
		t.nonNull.string("token");
		t.nonNull.field("user", {
			type: "User",
		});
	},
});
