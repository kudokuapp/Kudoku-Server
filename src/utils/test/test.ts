import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import 'dotenv/config';

(async () => {
  const APP_SECRET = process.env.APP_SECRET as string;
  // const token =
  // 	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MzQ1OGMyYzY3NzViNGNiM2I4OGUxOWEiLCJpYXQiOjE2NjgzNzkyNDl9.ni6BlH4RXV5gOyxOLVkaUdBhhG7Dsl-9s8Tvb7jhUn8";
  // const valid = jwt.verify(token, APP_SECRET);
  // const HASH_STRING =
  // 	"$2a$10$D1ZJc4G0GSNL3Q1zQa308OQ4To44Bjy867UcucK/qmM.ySKcOueLC";

  // console.log("hash string", HASH_STRING);

  // const valid = await bcrypt.compare(APP_SECRET, HASH_STRING);
  const token = jwt.sign({ userId: '63458c2c6775b4cb3b88e19a' }, APP_SECRET, {
    expiresIn: '5m',
  });

  const valid = jwt.verify(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MzQ1OGMyYzY3NzViNGNiM2I4OGUxOWEiLCJpYXQiOjE2Njg0MTIxMjMsImV4cCI6MTY2ODQxMjQyM30.azMoQg9RTwicGd9QsujZzlYqbewU37CZaHR4ZSPw5nI',
    APP_SECRET
  );

  console.log(valid);
})();
