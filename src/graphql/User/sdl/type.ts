import { objectType } from "nexus";

export const User = objectType({
	name: "User",
	definition(t) {
		t.nonNull.string("id");
		t.nonNull.string("username");
		t.nonNull.string("name");
		t.nonNull.string("email");
		t.nonNull.string("whatsapp");
		t.nonNull.int("kudos");
	},
});
