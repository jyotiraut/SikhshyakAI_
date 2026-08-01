export function getBreadcrumbs(url: string) {
  if (url === '/dashboard' || url === '/dashboard/') {
    return [];
  }

  const breadcrumbUrls = url.split('/').filter((el) => !!el);

  const breadcrumbs = breadcrumbUrls.map((breadcrumb, index) => {
    const href = `/${breadcrumbUrls.slice(0, index + 1).join('/')}`;
    const label = breadcrumb
      .split('-')
      .map((word) => word.replace(word.charAt(0), word.charAt(0).toUpperCase()))
      .join(' ');
    const isLast = breadcrumbUrls.length === index + 1;
    return {
      href,
      label,
      isLast,
    };
  });

  if (breadcrumbs.length > 2) {
    const firstTwo = breadcrumbs.splice(0, 1);
    const last = breadcrumbs.splice(-1);

    return [...firstTwo, breadcrumbs, ...last];
  }

  return breadcrumbs;
}
