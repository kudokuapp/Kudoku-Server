import { data } from "./data";

const start = new Date();

interface BankData {
	dateTimestamp: string;
	amount: number;
	description: string;
	status: string;
	direction: string;
}

let newArray: BankData[] = [];

for (let i in data) {
	const { dateTimestamp, amount, description, status, direction } = data[i];
	const dataObj = { dateTimestamp, amount, description, status, direction };
	newArray.push(dataObj);
}

const kartu_debit: BankData[] = [];
const kartu_kredit: BankData[] = [];
const trsf_ebanking_db: BankData[] = [];
const trsf_ebanking_cr: BankData[] = [];
const byr_via_ebanking: BankData[] = [];
const byr_via_atm: BankData[] = [];
const tarikan_atm: BankData[] = [];
const db_interchange: BankData[] = [];
const flazz: BankData[] = [];
const db_debit_domestik: BankData[] = [];
const kr_interchange: BankData[] = [];
const biaya_adm: BankData[] = [];
const setoran: BankData[] = [];
const db_otomatis: BankData[] = [];
const switching: BankData[] = [];
const transaksi_debit: BankData[] = [];
const kr_otomatis: BankData[] = [];
const selain_diatas: BankData[] = [];

for (let i in newArray) {
	const description = newArray[i].description;
	if (/KARTU DEBIT/g.test(description)) {
		kartu_debit.push(newArray[i]);
	} else if (/TRANSAKSI DEBIT/g.test(description)) {
		transaksi_debit.push(newArray[i]);
	} else if (/DB DEBIT DOMESTIK/g.test(description)) {
		db_debit_domestik.push(newArray[i]);
	} else if (/DB INTERCHANGE/g.test(description)) {
		db_interchange.push(newArray[i]);
	} else if (/KARTU KREDIT/g.test(description)) {
		kartu_kredit.push(newArray[i]);
	} else if (/TRSF E-BANKING DB/g.test(description)) {
		trsf_ebanking_db.push(newArray[i]);
	} else if (/TRSF E-BANKING CR/g.test(description)) {
		trsf_ebanking_cr.push(newArray[i]);
	} else if (/BYR VIA E-BANKING/g.test(description)) {
		byr_via_ebanking.push(newArray[i]);
	} else if (/BYR VIA ATM/g.test(description)) {
		byr_via_atm.push(newArray[i]);
	} else if (/TARIKAN ATM/g.test(description)) {
		tarikan_atm.push(newArray[i]);
	} else if (/FLAZZ/g.test(description)) {
		flazz.push(newArray[i]);
	} else if (/KR INTERCHANGE/g.test(description)) {
		kr_interchange.push(newArray[i]);
	} else if (/BIAYA ADM/g.test(description)) {
		biaya_adm.push(newArray[i]);
	} else if (/SETORAN/g.test(description)) {
		setoran.push(newArray[i]);
	} else if (/DB OTOMATIS/g.test(description)) {
		db_otomatis.push(newArray[i]);
	} else if (/SWITCHING/g.test(description)) {
		switching.push(newArray[i]);
	} else if (/KR OTOMATIS/g.test(description)) {
		kr_otomatis.push(newArray[i]);
	} else {
		selain_diatas.push(newArray[i]);
	}
}

const end = new Date();

// console.log(`Time took ${end.getMilliseconds() - start.getMilliseconds()}`);
const test = new Date(kartu_debit[20].dateTimestamp);
const tanggal = `${test.getDate()} - ${test.getMonth()} - ${test.getFullYear()} jam ${test.getHours()} menit ${test.getMinutes()}`;
console.log(kr_otomatis);
// console.log(kr_otomatis);

// const titit = new Date("2022-08-28T17:00:00.000+00:00");
// console.log(titit.getHours());
