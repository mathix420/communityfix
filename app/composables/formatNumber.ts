export function formatNumber(number: number, options: { hash?: boolean } = { hash: true }) {
    return `${options.hash ? '#' : ''}${number.toString().padStart(5, '0')}`
}
