import { Severity } from './const';

export enum InternalLinks {
  Home = '/',
}

export const DeviceWidthObject = {
  sm: { max: 767, min: 640 },
  md: { max: 1023, min: 768 },
  lg: { max: 1279, min: 1024 },
  xl: { max: 1535, min: 1280 },
  _2xl: { max: 20000, min: 1536 }
};

export const getWindowDimension = () => {
  const width = window.innerWidth
    || document.documentElement.clientWidth
    || document.body.clientWidth;
  const height = window.innerHeight
    || document.documentElement.clientHeight
    || document.body.clientHeight;
  return { width, height }
};

export const colorForSeverity = (severity: Severity) => {
  switch (severity) {
    case Severity.Error:
      return '#eb5a46';
    case Severity.User:
      return '#82e4fa';
    case Severity.Success:
      return '#5ac777';
    case Severity.Normal:
    default:
      return '#ffffff';
  }
};
