export const isNullOrUndefined = (input: any): boolean => {
  if (input !== null && input !== undefined)
    return input.toString().replace(/\s/g, '').length > 0 ? false : true;
  else return true;
};

export const isEmpty = (input: string): boolean => {
  let isEmpty = true;

  if (input !== null || input !== undefined)
    isEmpty =
      !!input && input.toString().replace(/\s/g, '').length > 0 ? false : true;

  return isEmpty;
};
