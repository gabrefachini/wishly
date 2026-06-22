import type { Locale } from "../i18n/formatters";

export type LocalizedText = Record<Locale, string>;
export type GiftStatus = "available" | "reserved" | "purchased";
export type GiftPriority = "mustHave" | "niceToHave" | "surpriseMe";
export type SummaryKind = "gifts" | "reserved" | "shared";

export type Gift = {
  id: string;
  name: LocalizedText;
  store: string;
  price: number;
  priority: GiftPriority;
  status: GiftStatus;
  image: string;
  note?: LocalizedText;
  groupGift?: boolean;
};

export type Wishlist = {
  id: string;
  shareId: string;
  title: LocalizedText;
  occasion: string;
  date: string;
  cover: string;
  accent: string;
  summary: {
    kind: SummaryKind;
    count?: number;
  };
  message: LocalizedText;
  gifts: Gift[];
};

export function localized(value: LocalizedText, locale: Locale) {
  return value[locale] ?? value.en;
}

export const wishlists: Wishlist[] = [
  {
    id: "sofia-birthday",
    shareId: "sofia-7",
    title: {
      en: "Sofia's Birthday",
      "pt-BR": "Aniversário da Sofia",
    },
    occasion: "birthday",
    date: "2026-08-24",
    cover:
      "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80",
    accent: "bg-blush",
    summary: {
      kind: "gifts",
      count: 12,
    },
    message: {
      en: "I made this little list to help everyone who asked for gift ideas",
      "pt-BR": "Montei essa listinha para ajudar quem pediu sugestões de presente",
    },
    gifts: [
      {
        id: "wooden-camera",
        name: {
          en: "Wooden Toy Camera",
          "pt-BR": "Câmera de brinquedo em madeira",
        },
        store: "Little Studio",
        price: 34,
        priority: "mustHave",
        status: "available",
        image:
          "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?auto=format&fit=crop&w=600&q=80",
        note: {
          en: "Soft colors or natural wood are perfect.",
          "pt-BR": "Cores suaves ou madeira natural são perfeitas.",
        },
      },
      {
        id: "story-books",
        name: {
          en: "Story Book Collection",
          "pt-BR": "Coleção de livros infantis",
        },
        store: "Book Nook",
        price: 48,
        priority: "niceToHave",
        status: "reserved",
        image:
          "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
        note: {
          en: "Bedtime stories with beautiful illustrations.",
          "pt-BR": "Histórias para dormir com ilustrações lindas.",
        },
      },
      {
        id: "art-kit",
        name: {
          en: "Art Supplies Kit",
          "pt-BR": "Kit de materiais de arte",
        },
        store: "Tiny Makers",
        price: 29,
        priority: "surpriseMe",
        status: "purchased",
        image:
          "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "pajama-set",
        name: {
          en: "Cozy Pajama Set",
          "pt-BR": "Conjunto de pijama aconchegante",
        },
        store: "Sunday Cotton",
        price: 42,
        priority: "niceToHave",
        status: "available",
        image:
          "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=600&q=80",
      },
    ],
  },
  {
    id: "laura-baby-shower",
    shareId: "baby-laura",
    title: {
      en: "Laura's Baby Shower",
      "pt-BR": "Chá de bebê da Laura",
    },
    occasion: "babyShower",
    date: "2026-09-12",
    cover:
      "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=900&q=80",
    accent: "bg-skysoft",
    summary: {
      kind: "reserved",
      count: 5,
    },
    message: {
      en: "A gentle list for the first cozy weeks at home",
      "pt-BR": "Uma lista carinhosa para as primeiras semanas em casa",
    },
    gifts: [
      {
        id: "baby-blanket",
        name: {
          en: "Baby Blanket",
          "pt-BR": "Manta de bebê",
        },
        store: "Nest & Co.",
        price: 58,
        priority: "mustHave",
        status: "available",
        image:
          "https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=600&q=80",
      },
    ],
  },
  {
    id: "christmas",
    shareId: "winter-wishes",
    title: {
      en: "Christmas Wishlist",
      "pt-BR": "Lista de Natal",
    },
    occasion: "holiday",
    date: "2026-12-25",
    cover:
      "https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=900&q=80",
    accent: "bg-lavender",
    summary: {
      kind: "shared",
    },
    message: {
      en: "A few thoughtful ideas for the holiday season",
      "pt-BR": "Algumas ideias especiais para o fim de ano",
    },
    gifts: [
      {
        id: "smart-speaker",
        name: {
          en: "Smart Speaker",
          "pt-BR": "Caixa de som inteligente",
        },
        store: "Modern Home",
        price: 129,
        priority: "niceToHave",
        status: "available",
        image:
          "https://images.unsplash.com/photo-1543512214-318c7553f230?auto=format&fit=crop&w=600&q=80",
        groupGift: true,
      },
    ],
  },
  {
    id: "new-home",
    shareId: "new-home",
    title: {
      en: "New Home",
      "pt-BR": "Casa nova",
    },
    occasion: "housewarming",
    date: "2026-10-03",
    cover:
      "https://images.unsplash.com/photo-1513161455079-7dc1de15ef3e?auto=format&fit=crop&w=900&q=80",
    accent: "bg-warm-100",
    summary: {
      kind: "gifts",
      count: 8,
    },
    message: {
      en: "Warm ideas for making the new place feel like home",
      "pt-BR": "Ideias acolhedoras para a casa nova parecer lar",
    },
    gifts: [
      {
        id: "coffee-machine",
        name: {
          en: "Coffee Machine",
          "pt-BR": "Cafeteira",
        },
        store: "Brew House",
        price: 189,
        priority: "mustHave",
        status: "available",
        image:
          "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=600&q=80",
        groupGift: true,
      },
    ],
  },
];

export const featuredGift = wishlists[0].gifts[0];
