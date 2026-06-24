export function updateMetadata({
  title,
  description,
  url,
  image,
  type = "website",
}: {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: string;
}) {
  if (typeof document === "undefined") {
    return;
  }

  document.title = title;

  setMeta("name", "description", description);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:type", type);

  if (url) {
    setMeta("property", "og:url", url);
  }

  if (image) {
    setMeta("property", "og:image", image);
  }
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}
