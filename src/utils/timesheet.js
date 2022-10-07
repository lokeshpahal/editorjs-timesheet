
export function minutesToHoursMinutes(minutes) {
  let hours;
  hours = Math.floor(minutes / 60);
  minutes = minutes - (hours * 60);
  return [hours, minutes];
}

export function minutesToLabel(minutes) {
  let hm;
  if ((minutes == null) || minutes === 0) {
    return '';
  }
  hm = minutesToHoursMinutes(minutes);
  if (hm[0] === 0) {
    return hm[1] + ' minutes';
  }
  if (hm[1] === 0) {
    return hm[0] + ' hours';
  }
  return hm[0] + 'h:' + hm[1] + 'm';
}
