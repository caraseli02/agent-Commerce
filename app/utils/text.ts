export const textUtil = {
  slugify(val: string) {
    return val
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w-]+/g, '') // Remove all non-word characters
      .replace(/--+/g, '-'); // Replace multiple - with single -
  },
};
