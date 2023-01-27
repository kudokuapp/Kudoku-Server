export const cleanDate = (date: Date | string): string => {
  const dateSrc = new Date(date);

  const year = dateSrc.getFullYear();

  const monthSrc = dateSrc.getMonth() + 1;

  const month = monthSrc < 10 ? `0${monthSrc}` : `${monthSrc}`;

  const getDateSrc = dateSrc.getDate();

  const getDate = getDateSrc < 10 ? `0${getDateSrc}` : `${getDateSrc}`;

  return `${year}-${month}-${getDate}`;
};

export const cleanTimeStamp = (date: Date | string) => {
  const dateSrc = new Date(date);

  const hoursSrc = dateSrc.getHours();

  const hours = hoursSrc < 10 ? `0${hoursSrc}` : `${hoursSrc}`;

  const minutesSrc = dateSrc.getMinutes();

  const minutes = minutesSrc < 10 ? `0${minutesSrc}` : `${minutesSrc}`;

  const secondsSrc = dateSrc.getSeconds();

  const seconds = secondsSrc < 10 ? `0${secondsSrc}` : `${secondsSrc}`;

  const milisecondsSrc = dateSrc.getMilliseconds();

  let miliseconds: string;

  if (milisecondsSrc < 10) {
    miliseconds = `00${milisecondsSrc}`;
  } else if (milisecondsSrc < 100) {
    miliseconds = `0${milisecondsSrc}`;
  } else {
    miliseconds = `${milisecondsSrc}`;
  }

  return `${hours}:${minutes}:${seconds}.${miliseconds}`;
};

export const toTimeStamp = (date: Date | string) => {
  // 2023-01-26T09:58:09.882Z

  const newDate = new Date(date);

  return `${cleanDate(newDate)}T${cleanTimeStamp(newDate)}Z`;
};
