export const useTrimText = (text: string, length = 20) => {
  return `${text.length > length ? text.substring(0, length - 3) + '...' : text}`;
};
