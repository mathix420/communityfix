/** Self-referencing canonical from origin + pathname (query/hash stripped). */
export function useCanonical(): void {
  const url = useRequestURL()

  useHead({
    link: [
      {
        rel: 'canonical',
        href: url.origin + url.pathname,
      },
    ],
  })
}
