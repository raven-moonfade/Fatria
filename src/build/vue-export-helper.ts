export default function exportComponent<T extends Record<string, any>>(sfc: T, props: [string, any][]): T {
  const target = sfc.__vccOpts || sfc;

  for (const [key, value] of props) {
    target[key] = value;
  }

  return target;
}
