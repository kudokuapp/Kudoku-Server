export const cleanDate = (date: Date | string): string => {
  const dateSrc = new Date(date);

  const year = dateSrc.getFullYear();

  const monthSrc = dateSrc.getMonth() + 1;

  const month = monthSrc < 10 ? `0${monthSrc}` : `${monthSrc}`;

  const getDateSrc = dateSrc.getDate();

  const getDate = getDateSrc < 10 ? `0${getDateSrc}` : `${getDateSrc}`;

  return `${year}-${month}-${getDate}`;
};
