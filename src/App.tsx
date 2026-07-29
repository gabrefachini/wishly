import {
  ArrowLeft,
  ArrowDown,
  ArrowRight,
  Bell,
  Clock3,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Gift,
  Heart,
  Home,
  Link2,
  LineChart,
  Lock,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Share2,
  PencilLine,
  ShieldCheck,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  TrendingDown,
  Upload,
  User,
  Settings,
  XCircle,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import {
  createWishlist,
  addListTemplateItem,
  createWishlistFromTemplate,
  deleteGift,
  deleteListTemplate,
  deleteListTemplateItem,
  deleteWishlist,
  loadListTemplates,
  saveListTemplate,
  updateGift,
  createGift,
  getInitialSession,
  listenToAuthChanges,
  loadAdminAffiliateQueue,
  loadAdminAccountDeletionRequests,
  extractProductFromUrl,
  processAdminAccountDeletionRequest,
  publishWishlistForSharing,
  reservePublicGift,
  resolvePublicGiftRedirect,
  loadViewerContext,
  loadWishlistGifts,
  getMercadoLivreAuthorizationUrl,
  signInWithPassword,
  resetPasswordForEmail,
  signUpWithPassword,
  signOut,
  supabaseEnabled,
  updateAdminAffiliateLink,
  updateViewerEmail,
  updateViewerPassword,
  updateViewerPreferences,
  updateViewerProfile,
  updateWishlistDetails,
  requestViewerAccountDeletion,
  updateRecoveredPassword,
  type AdminAccountDeletionRequest,
  type AdminAffiliateQueueItem,
  type ListTemplate,
  type DbWish,
  type DbWishlist,
  type MercadoLivreConnectionStatus,
  type PublicWishlist,
  type ProductExtractionResult,
  loadPublicWishlist,
} from "./lib/wishly-api";
import {
  PRODUCT_PLACEHOLDER_DATA_URL,
  WishSubmissionLock,
  buildWishSubmissionFingerprint,
  getExtractionFeedback,
  getProductImageSrc,
  getMissingWishFieldCopy,
  getMissingWishFields,
  getWishSubmissionReadiness,
  isAutofillResultCurrent,
  sanitizeMercadoLivrePreview,
} from "./lib/product-autofill";
import { resolveAddWishTargetId } from "./lib/add-wish-target";
import { buildDefaultListCover, resolveListCover } from "./lib/listCover";
import {
  addManualImageUrl,
  getPrimaryProductImage,
  mergeAutofillProductImages,
  moveProductImage,
  prepareUploadedProductImage,
  removeProductImage,
  selectPrimaryProductImage,
  type ProductImageDraft,
} from "./lib/product-images";

/**
 * Alerta de preço por desejo. `targetAmount` nulo = acompanhar sem preço-alvo.
 */
type PriceAlert = {
  targetAmount: number | null;
};

type RadarSortKey = "prioridade" | "preco" | "alvo" | "falta" | "queda";

const RADAR_COLUMNS: Array<{ key: RadarSortKey; label: string }> = [
  { key: "preco", label: "Preço" },
  { key: "alvo", label: "Alvo" },
  { key: "falta", label: "Falta" },
  { key: "queda", label: "Queda" },
];

type HomeListSummary = {
  id: string;
  title: string;
  coverUrl: string;
  meta: string;
  isSelected: boolean;
};

type ReserveDetails = {
  name: string;
  email: string;
  message: string;
};

type View =
  | "home"
  | "create_list"
  | "list"
  | "add"
  | "reset_password"
  | "radar"
  | "activity"
  | "profile"
  | "profile_settings"
  | "pro"
  | "checkout"
  | "success"
  | "admin";
type Priority = "Alta" | "Media" | "Baixa";
type AuthPanelMode = "create" | "login";
type CreateListMode = "create" | "edit";
type AuthSubmitState = "idle" | "submitting" | "success" | "error";
type PasswordResetFormState = {
  newPassword: string;
  confirmNewPassword: string;
};
type LocalSource = "mercado_livre" | "amazon" | "shopee" | "magalu" | "unknown";
type LocalAffiliateStatus = "not_generated" | "generated" | "invalid" | "unavailable";
type LocalAffiliateTaskStatus = "pending" | "completed" | "invalid" | "unavailable";

type LocalWish = {
  id: number;
  title: string;
  store: string;
  price: string;
  image: string | null;
  status?: string;
  priority?: Priority;
  drop?: string;
  originalUrl: string;
  resolvedUrl: string | null;
  affiliateUrl: string | null;
  source: LocalSource;
  affiliateStatus: LocalAffiliateStatus;
};

type LocalAffiliateTask = {
  id: number;
  giftId: number;
  wishlistId: string;
  wishlistName: string;
  itemTitle: string;
  originalUrl: string;
  resolvedUrl: string | null;
  source: LocalSource;
  status: LocalAffiliateTaskStatus;
  createdByUserName: string;
  createdAt: string;
  completedAt: string | null;
  completedByAdminName: string | null;
};

type AddWishFormState = {
  productUrl: string;
  title: string;
  note: string;
  imageUrl: string;
  imageUrlsText: string;
  images: ProductImageDraft[];
  removedImageUrls: string[];
  currentPrice: string;
  originalPrice: string;
  cashPrice: string;
  installmentQuantity: string;
  installmentAmount: string;
  installmentInterestFree: boolean | null;
  currency: string;
  availability: "in_stock" | "out_of_stock" | "preorder" | "unknown";
  storeName: string;
  marketplace: string;
  canonicalUrl: string;
  externalProductId: string;
  externalVariantId: string;
  selectedVariantText: string;
};

type ProductExtractionState = {
  status: "idle" | "loading" | "success" | "partial" | "error";
  message: string;
  provider: ProductExtractionResult["provider"] | null;
  preview: ProductExtractionResult | null;
  extractedUrl: string | null;
  errorCode: string | null;
};

type CreateListFormState = {
  title: string;
  coverFile: File | null;
  coverPreview: string | null;
};

type AuthFormState = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type ViewerState = {
  wishlists: DbWishlist[];
  selectedWishlistId: string | null;
  gifts: DbWish[];
  isAdmin: boolean;
  meliConnection: MercadoLivreConnectionStatus | null;
};

type PublicState = {
  shareId: string | null;
  wishlist: PublicWishlist | null;
  loading: boolean;
  notFound: boolean;
};

type LocalProfile = {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  privacy: {
    profileVisibility: "public" | "private";
    defaultListVisibility: "public" | "private";
  };
  deletionRequestedAt: string | null;
};

type ProfileFormState = {
  fullName: string;
  email: string;
  avatarUrl: string | null;
};

type AccessFormState = {
  nextEmail: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

type PrivacyFormState = {
  profileVisibility: "public" | "private";
  defaultListVisibility: "public" | "private";
  deleteConfirmText: string;
};

const AUTH_REQUEST_TIMEOUT_MS = 15_000;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function trackAuthEvent(event: "login_started" | "login_success" | "login_failed" | "login_timeout" | "password_recovery_requested") {
  window.dispatchEvent(new CustomEvent("wishly:auth", { detail: { event } }));
}

function hasPasswordRecoveryParams() {
  if (typeof window === "undefined") return false;

  const url = new URL(window.location.href);
  if (url.searchParams.get("type") === "recovery") return true;

  if (!url.hash) return false;

  const hashParams = new URLSearchParams(url.hash.slice(1));
  return hashParams.get("type") === "recovery";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("A solicitação demorou mais que o esperado. Verifique sua conexão e tente novamente.")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

const images = {
  avatar:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAG2Y2VTgeXcEjSqbOtjwrXTYdsExUx_bz5wu2gyyVVMG87P5sy0tFw0jj5q3mPvJNaX4CpOyzlwWqGoskkx_e0D_phCuiF4ClqvdVsYENua--BWr_6SCHxBtlY-MRIdNf1dB25QCxnxE_WBgnZ_oL-3G0o5V1WypHIRV9p8xuuowHWCQ_WckczZBpF7yVDEND44iFYgv9PFpyQwWAdCO0kQjLmToadETocdDB3BBdy_iuAfQf6EnGczA",
  logo:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBOtoaaZVNz4IZ66Gy03J7XdDLDLNQHmqptRx1l10UeOoFWXYcl0_4_Y5z1k28Zm2djSUeSy4MBBaF4CzxJ6-G_mZovdBdZuZncT2M1ZwfdhfDRODfu98f_9x8R4O-QPi3ToFwkEf4LS40R55GV7Uaax2DejejclMgMpaAJU54JTXiB4hqezsmv3TlIPQbZ8lbSN2uDhxmyBnTmj6StuI4tXz6jQmZwxxjeo6rEcqqbdcHxHBXrQiPztN7vP6mx0DaWbh8",
  home:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBgU2X0Qpu6PexEUBCScdIUV45Y1G5y39ZBKtWvaxI3fb3sD5UdbcGdFIOq8kE2JlUK3q3hkonMKVzL13xlGkUMzIitIo1qntC6HQDFkEiJbkBEWll3K-3-vqaY2m84eZ0lldrbf12Cnkm5TMPb2kyFwfzfpH7PpXkhmR2dEUrqnVEUNEbRoo0S_N9IN8QQZFvHmBbvRPryMWZFkLj9g2Qlxds7jbmiTMCBE6ln93YIP_0TbaPWCq0X6g",
  setup:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC5HnkE7pLO4yECxiPUFRx18deRvwZ2keaV7YMhv5Y0cdl1e-Es_Milh6mVRO6Cgs673dENGpwNfpY7g4Nnwbg8-PFd1yJdeT-3O96us8jGBp3cFC-IYsc4ZkFr6-cmp3rg15xBdvydHDbnKmTtv84_83_v1zq4ivoYSKjZkAY4rHYkoMsN0PEL4rMJOHXrcOaVQdyuQTwCVxQ74mGz_ko8Hjys1_EiwV0oiQxVAE4jrELseVIkHcOJTQ",
  travel:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDWRlaDPS2ep-tB96wtG3W4dOhmr4PEd9J30JmOVJ2nLYNZXRnxI-40uofrdBsJCFE6PWSNHLt6cIZUlu8ibZWxJJTdXVFICj5-qnaaxTOgCdx8QH6uFfsi3iDhhwAAxT8g07XJ7ZJObtwMDE_d3y2oegJPjwCzZauRDOO2pJeehrM3-hhDghO5RAB7e2sZM7BGhyIjmkv_elf61hu2ZGd-S-b1SWvD39NIW-SXMfz-eLWqptn5XzgQrg",
  ideaHome:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCQ-NOX2AsI2MayMUPMOU1QDyNzG6fAG1C9iWm7Rudf4IP4bV_9HdxtMNGyMCH5gzoWBeQbBFSwL9D-pgQL2Y4zvWLSu_-rYGa9aV8rwzrhTnMGGg4DPhvowYkESzkj1gR7kYo8Oc_RbK2YVB9s6JlrX8LyctWkRzd-oE7ZKqi3BvX3GEzX8nFrsk_MFCKTLKpyAU1Qt39vvOyNyg8C35JxzWS_dICZcOYoYGXaK6j4EfDVaK79mjcDpw",
  baby:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD6c4MrVjerEYozFjoVFhdkKV4NY8zSN7R-WrnykpynR85KWXjT7eFr4C6XU3RksyCPGX5J5-7C4jGRi2uyekiJrnikyhyBg-FEUWk_TSGNmOlX3gTN2wCpq6iqCtonQGhI6PmDqOKcvdyDgo2Ad6sIyyl70IX3_lh5CSGQ-wimDVJ23O2k9y0Nj4EIs6vY55QKkAeF3R_yeDov30BxvmiBjb2Z6KU5YX-FbwSygIo563o_Bu2n_ya_cQ",
  plane:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBQyeaafjqr6CtJaSTHF0KE2OAcyEeqZQBsgiDY-iWknpn0jHz0q14Z5-Xn2bzsCiFFiaQA_AEIrpeh-KLEcR35UeqC9T2tpswaXIquSGawQ1E4gz0cDANhUzHvy9LXqQqFKJGbVWXFcPL727gBsvOFgegT1yQLi2D65j34J03lDKFJqUrHNgGpQgOSfik7UO7wOOsXlDB4IVDug1W5P5o4StYlvDjc3iXwnF8GAL3-oSs6M3rkMcGN1g",
};

// Demonstração: dois itens já monitorados, um deles com preço-alvo definido.
const priceAlertsSeed: Record<string, PriceAlert> = {
  "1": { targetAmount: null },
  "3": { targetAmount: 620 },
};

const localWishesSeed: LocalWish[] = [
  {
    id: 1,
    title: "Poltrona Boucle",
    store: "Westwing",
    price: "R$ 1.899",
    image: images.home,
    status: "Reservado",
    priority: "Alta",
    drop: "-18%",
    originalUrl: "https://www.westwing.com.br/poltrona-boucle",
    resolvedUrl: "https://www.westwing.com.br/poltrona-boucle",
    affiliateUrl: null,
    source: "unknown",
    affiliateStatus: "unavailable",
  },
  {
    id: 2,
    title: "Mesa de centro travertino",
    store: "Tok&Stok",
    price: "R$ 2.340",
    image: images.ideaHome,
    priority: "Media",
    originalUrl: "https://www.tokstok.com.br/mesa-centro-travertino",
    resolvedUrl: "https://www.tokstok.com.br/mesa-centro-travertino",
    affiliateUrl: null,
    source: "unknown",
    affiliateStatus: "unavailable",
  },
  {
    id: 3,
    title: "Luminaria de leitura",
    store: "Lumini",
    price: "R$ 690",
    image: images.setup,
    priority: "Alta",
    drop: "-9%",
    originalUrl: "https://www.lumini.com.br/luminaria-leitura",
    resolvedUrl: "https://www.lumini.com.br/luminaria-leitura",
    affiliateUrl: null,
    source: "unknown",
    affiliateStatus: "unavailable",
  },
  {
    id: 4,
    title: "Jogo de lencois algodao",
    store: "Trousseau",
    price: "R$ 449",
    image: images.baby,
    priority: "Baixa",
    originalUrl: "https://www.trousseau.com.br/jogo-lencois",
    resolvedUrl: "https://www.trousseau.com.br/jogo-lencois",
    affiliateUrl: null,
    source: "unknown",
    affiliateStatus: "unavailable",
  },
];

const activity = [
  "2 itens baixaram de preço na lista Casa nova.",
  "1 item voltou ao estoque em Setup dos sonhos.",
  "Mariana reservou Poltrona Boucle.",
  "Você recebeu 3 visitas na lista de Gabriel e Ana.",
];

const localListId = "casa-nova";
const localListName = "Casa nova";
const localCreatorName = "Gabriel Fachini";
const localAdminName = "Time Wishly";
const POST_AUTH_VIEW_KEY = "wishly-post-auth-view";
const PENDING_TEMPLATE_KEY = "wishly-pending-template";
const localProfileSeed: LocalProfile = {
  fullName: localCreatorName,
  email: "gabriel@wishly.app",
  avatarUrl: images.avatar,
  privacy: {
    profileVisibility: "private",
    defaultListVisibility: "public",
  },
  deletionRequestedAt: null,
};

const initialAddWishFormState: AddWishFormState = {
  productUrl: "",
  title: "",
  note: "",
  imageUrl: "",
  imageUrlsText: "",
  images: [],
  removedImageUrls: [],
  currentPrice: "",
  originalPrice: "",
  cashPrice: "",
  installmentQuantity: "",
  installmentAmount: "",
  installmentInterestFree: null,
  currency: "BRL",
  availability: "unknown",
  storeName: "",
  marketplace: "",
  canonicalUrl: "",
  externalProductId: "",
  externalVariantId: "",
  selectedVariantText: "",
};

function App() {
  const [view, setView] = useState<View>("home");
  const [selectedPriority, setSelectedPriority] = useState<Priority>("Alta");
  const [priceAlerts, setPriceAlerts] = useState<Record<string, PriceAlert>>(() =>
    readLocalState("wishly-price-alerts", priceAlertsSeed),
  );
  const [localListTitle, setLocalListTitle] = useState(localListName);
  const [localListCoverUrl, setLocalListCoverUrl] = useState(images.home);
  const [createListMode, setCreateListMode] = useState<CreateListMode>("create");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("wishly-theme") === "dark" ? "dark" : "light";
  });
  const [localWishes, setLocalWishes] = useState<LocalWish[]>(() => readLocalState("wishly-wishes", localWishesSeed));
  const [localAffiliateTasks, setLocalAffiliateTasks] = useState<LocalAffiliateTask[]>(() =>
    readLocalState("wishly-affiliate-tasks", []),
  );
  const [localProfile, setLocalProfile] = useState<LocalProfile>(() => readLocalState("wishly-local-profile", localProfileSeed));
  const [formState, setFormState] = useState<AddWishFormState>(initialAddWishFormState);
  const [addWishTargetId, setAddWishTargetId] = useState<string | null>(null);
  const [addWishReturnView, setAddWishReturnView] = useState<"home" | "list">("home");
  const [extractionState, setExtractionState] = useState<ProductExtractionState>({
    status: "idle",
    message: "",
    provider: null,
    preview: null,
    extractedUrl: null,
    errorCode: null,
  });
  const addWishSubmissionLock = useRef(new WishSubmissionLock());
  const extractionRequestIdRef = useRef(0);
  const [createListForm, setCreateListForm] = useState<CreateListFormState>({
    title: "",
    coverFile: null,
    coverPreview: null,
  });
  const [profileForm, setProfileForm] = useState<ProfileFormState>(localProfileSeed);
  const [accessForm, setAccessForm] = useState<AccessFormState>({
    nextEmail: localProfileSeed.email,
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [privacyForm, setPrivacyForm] = useState<PrivacyFormState>({
    profileVisibility: localProfileSeed.privacy.profileVisibility,
    defaultListVisibility: localProfileSeed.privacy.defaultListVisibility,
    deleteConfirmText: "",
  });
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);
  const [draftAffiliateUrls, setDraftAffiliateUrls] = useState<Record<string, string>>({});
  const [marketingMenuOpen, setMarketingMenuOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [authForm, setAuthForm] = useState<AuthFormState>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [passwordResetForm, setPasswordResetForm] = useState<PasswordResetFormState>({
    newPassword: "",
    confirmNewPassword: "",
  });
  const [authMessage, setAuthMessage] = useState("");
  const [authSubmitState, setAuthSubmitState] = useState<AuthSubmitState>("idle");
  const [authPanelMode, setAuthPanelMode] = useState<AuthPanelMode>("login");
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(hasPasswordRecoveryParams());
  const [syncError, setSyncError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [meliConnecting, setMeliConnecting] = useState(false);
  const [remoteReady, setRemoteReady] = useState(!supabaseEnabled);
  const [remote, setRemote] = useState<ViewerState>({
    wishlists: [],
    selectedWishlistId: null,
    gifts: [],
    isAdmin: false,
    meliConnection: null,
  });
  const [adminQueue, setAdminQueue] = useState<AdminAffiliateQueueItem[]>([]);
  const [adminDeletionRequests, setAdminDeletionRequests] = useState<AdminAccountDeletionRequest[]>([]);
  const [reserving, setReserving] = useState(false);
  const [listTemplates, setListTemplates] = useState<ListTemplate[]>([]);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [listPaletteOpen, setListPaletteOpen] = useState(false);
  const [deleteListConfirmOpen, setDeleteListConfirmOpen] = useState(false);
  const [alertTarget, setAlertTarget] = useState<LocalWish | DbWish | null>(null);
  const [completeWishTarget, setCompleteWishTarget] = useState<LocalWish | DbWish | null>(null);
  const [editWishTarget, setEditWishTarget] = useState<LocalWish | DbWish | null>(null);
  const [shareSheet, setShareSheet] = useState<{ url: string; title: string } | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [publicState, setPublicState] = useState<PublicState>({
    shareId: readPublicShareId(),
    wishlist: null,
    loading: false,
    notFound: false,
  });

  const isRemoteMode = supabaseEnabled && Boolean(session);
  const isPublicMode = !session && Boolean(publicState.shareId);
  const isMarketingMode = view === "home" && !session && !isPublicMode;
  const isDesktopFlowMode = Boolean(session) && (view === "create_list" || view === "add");
  const viewerProfile = useMemo(
    () => (isRemoteMode && session?.user ? getRemoteProfile(session.user) : localProfile),
    [isRemoteMode, localProfile, session],
  );
  const showFab = !["admin", "add", "create_list", "profile", "profile_settings", "reset_password", "pro", "checkout", "success"].includes(view);

  const title = useMemo(() => {
    if (view === "home") return "";
    if (view === "create_list") return "Criar lista";
    if (view === "list") return currentListTitle(remote, isRemoteMode, localListTitle);
    if (view === "add") return "Adicionar desejo";
    if (view === "radar") return "Radar de preços";
    if (view === "activity") return "Atividade";
    if (view === "profile") return "Perfil";
    if (view === "profile_settings") return "Configurações da conta";
    if (view === "reset_password") return "Redefinir senha";
    if (view === "pro") return "Wishly Pro";
    if (view === "checkout") return "Finalizar assinatura";
    if (view === "admin") return "Fila de afiliados";
    return "Assinatura confirmada";
  }, [view, remote, isRemoteMode, localListTitle]);

  const seo = useMemo(() => {
    const siteName = "Wishly";
    const currentTitle = title || "Lista de desejos online";
    const publicWishlistTitle = publicState.wishlist?.title?.trim();
    const baseUrl = typeof window === "undefined" ? "https://wishly.app" : window.location.origin;
    const canonicalUrl =
      isPublicMode && publicState.shareId
        ? buildPublicShareUrl(publicState.shareId)
        : `${baseUrl}/`;

    if (isPublicMode) {
      const listTitle = publicWishlistTitle || "lista compartilhada";
      return {
        title: `${listTitle} | ${siteName}`,
        description: `Confira a ${listTitle} no Wishly e veja os desejos organizados em uma lista compartilhada para presentear sem repetir itens.`,
        canonicalUrl,
        schema: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `${listTitle} | ${siteName}`,
          description: `Lista de desejos compartilhada no Wishly.`,
          url: canonicalUrl,
          isPartOf: {
            "@type": "WebSite",
            name: siteName,
            url: baseUrl,
          },
        },
      };
    }

    if (isMarketingMode) {
      return {
        title: `Wishly | Lista de desejos online`,
        description:
          "Crie sua lista de desejos online, adicione produtos por link, acompanhe preços e compartilhe com quem vai presentear.",
        canonicalUrl,
        schema: {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: siteName,
          applicationCategory: "ShoppingApplication",
          operatingSystem: "Web",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "BRL",
          },
          url: canonicalUrl,
          description:
            "Aplicativo de lista de desejos online para organizar produtos, acompanhar preços e compartilhar listas.",
        },
      };
    }

    const descriptions: Record<View, string> = {
      home: "Wishly | Lista de desejos online",
      create_list: "Crie uma nova lista de desejos no Wishly e organize produtos por ocasião, prioridade ou categoria.",
      list: `Veja e compartilhe sua lista de desejos${currentTitle ? `: ${currentTitle}` : ""}.`,
      add: "Adicione um produto à sua lista de desejos pelo link da loja e revise nome, imagem e preço antes de salvar.",
      reset_password: "Redefina sua senha no Wishly para continuar acessando suas listas.",
      radar: "Acompanhe preços de produtos da sua lista de desejos e receba sinais de queda, estoque e revisão.",
      activity: "Veja as últimas atualizações da sua lista de desejos no Wishly.",
      profile: "Gerencie seu perfil, privacidade e acesso no Wishly.",
      profile_settings: "Atualize nome, foto, e-mail, senha e privacidade da sua conta no Wishly.",
      pro: "Conheça o Wishly Pro com radar de preços, alertas e listas compartilhadas sem anúncios.",
      checkout: "Finalize sua assinatura do Wishly Pro com segurança.",
      success: "Assinatura confirmada no Wishly Pro.",
      admin: "Fila administrativa do Wishly para afiliados e solicitações de exclusão.",
    };

    return {
      title: `${currentTitle ? `${currentTitle} | ` : ""}${siteName}`,
      description: descriptions[view],
      canonicalUrl,
      schema: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `${currentTitle || siteName} | ${siteName}`,
        description: descriptions[view],
        url: canonicalUrl,
      },
    };
  }, [isMarketingMode, isPublicMode, publicState.shareId, publicState.wishlist?.title, title, view]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const upsertMeta = (selector: string, attributes: Record<string, string>) => {
      const existing = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      const element =
        existing ??
        document.createElement(selector.startsWith("link") ? "link" : "meta");

      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });

      if (!existing) document.head.appendChild(element);
    };

    document.title = seo.title;
    upsertMeta('meta[name="description"]', { name: "description", content: seo.description });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: seo.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: seo.description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: isPublicMode ? "article" : "website" });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: seo.canonicalUrl });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('link[rel="canonical"]', { rel: "canonical", href: seo.canonicalUrl });

    const scriptId = "wishly-json-ld";
    const existingScript = document.getElementById(scriptId);
    const script = existingScript ?? document.createElement("script");
    script.id = scriptId;
    script.setAttribute("type", "application/ld+json");
    script.textContent = JSON.stringify(seo.schema);
    if (!existingScript) document.head.appendChild(script);
  }, [isPublicMode, seo]);

  const localPendingTasks = useMemo(
    () => localAffiliateTasks.filter((task) => task.status === "pending"),
    [localAffiliateTasks],
  );
  const currentWishes = useMemo(() => (isRemoteMode ? remote.gifts : localWishes), [isRemoteMode, remote.gifts, localWishes]);
  const pendingCount = isRemoteMode
    ? adminQueue.filter((item) => item.affiliate_status !== "generated").length
    : localPendingTasks.length;

  // Listas reais da pessoa: as remotas quando há sessão, a lista local caso contrário.
  const homeLists = useMemo<HomeListSummary[]>(() => {
    if (isRemoteMode) {
      return remote.wishlists.map((wishlist) => {
        const isSelected = wishlist.id === remote.selectedWishlistId;
        return {
          id: wishlist.id,
          title: wishlist.title,
          coverUrl: resolveListCover(wishlist.cover_image_url, wishlist.title),
          // Só a lista aberta tem os desejos carregados, então evitamos números inventados.
          meta: isSelected ? formatWishCount(remote.gifts.length) : "Abrir lista",
          isSelected,
        };
      });
    }

    return [
      {
        id: localListId,
        title: localListTitle,
        coverUrl: localListCoverUrl,
        meta: formatWishCount(localWishes.length),
        isSelected: true,
      },
    ];
  }, [isRemoteMode, remote.wishlists, remote.selectedWishlistId, remote.gifts.length, localListTitle, localListCoverUrl, localWishes.length]);

  // Avisos derivados dos desejos reais, em vez de texto fixo.
  const homeNotices = useMemo(() => {
    const notices: string[] = [];
    const dropCount = currentWishes.filter((wish) => getWishDrop(wish)).length;
    const reservedCount = currentWishes.filter((wish) => getWishStatus(wish) === "Reservado").length;

    if (dropCount > 0) {
      notices.push(
        dropCount === 1
          ? "1 item baixou de preço na sua lista."
          : `${dropCount} itens baixaram de preço na sua lista.`,
      );
    }
    if (reservedCount > 0) {
      notices.push(
        reservedCount === 1
          ? "1 item foi reservado por um convidado."
          : `${reservedCount} itens foram reservados por convidados.`,
      );
    }

    return notices;
  }, [currentWishes]);

  function savePriceAlert(wishId: string, targetAmount: number | null) {
    setPriceAlerts((current) => ({ ...current, [wishId]: { targetAmount } }));
  }

  function removePriceAlert(wishId: string) {
    setPriceAlerts((current) => {
      const next = { ...current };
      delete next[wishId];
      return next;
    });
  }

  function go(viewName: View) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setView(viewName);
    setMarketingMenuOpen(false);
  }

  function beginAddWishFlow(wishlistId: string | null) {
    const validWishlistId = resolveAddWishTargetId({
      requestedWishlistId: wishlistId,
      availableWishlistIds: remote.wishlists.map((wishlist) => wishlist.id),
      isRemoteMode,
      localWishlistId: localListId,
    });

    setAddWishTargetId(validWishlistId);
    setAddWishReturnView(validWishlistId ? "list" : "home");
    setSyncError("");
    go("add");
  }

  function beginCreateListFlow() {
    setPasswordRecoveryMode(false);
    setCreateListMode("create");
    setAuthPanelMode("create");
    setAuthMessage("");
    setSyncError("");
    setAuthSubmitState("idle");
    setCreateListForm({ title: "", coverFile: null, coverPreview: null });

    if (session || !supabaseEnabled) {
      window.localStorage.removeItem(POST_AUTH_VIEW_KEY);
      go("create_list");
      return;
    }

    window.localStorage.setItem(POST_AUTH_VIEW_KEY, "create_list");
  }

  function beginLoginFlow() {
    setPasswordRecoveryMode(false);
    setCreateListMode("create");
    setAuthPanelMode("login");
    setAuthMessage("");
    setSyncError("");
    setAuthSubmitState("idle");
    window.localStorage.removeItem(POST_AUTH_VIEW_KEY);
  }

  function beginEditListFlow() {
    setCreateListMode("edit");
    setCreateListForm({
      title: isRemoteMode ? currentListTitle(remote, isRemoteMode, localListTitle) : localListTitle,
      coverFile: null,
      coverPreview: isRemoteMode ? currentListCover(remote, localListCoverUrl) : localListCoverUrl,
    });
    setSyncError("");
    setAuthMessage("");
    setAuthSubmitState("idle");
    go("create_list");
  }

  async function handleListCoverSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSyncError("A capa precisa estar em JPG, PNG ou WebP.");
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      setSyncError("A capa deve ter no máximo 6 MB.");
      return;
    }

    try {
      const preview = await readFileAsDataUrl(file);
      setCreateListForm((current) => ({
        ...current,
        coverFile: file,
        coverPreview: preview,
      }));
      setSyncError("");
    } catch {
      setSyncError("Não foi possível abrir essa imagem. Tente outra capa.");
    }
  }

  function resetAuthFlow() {
    setAuthMessage("");
    setSyncError("");
    setAuthSubmitState("idle");
    setAuthForm({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  }

  function resetPasswordField<K extends keyof PasswordResetFormState>(field: K, value: PasswordResetFormState[K]) {
    setSyncError("");
    setAuthMessage("");
    setPasswordResetForm((current) => ({ ...current, [field]: value }));
  }

  function updateAuthField<K extends keyof AuthFormState>(field: K, value: AuthFormState[K]) {
    setSyncError("");
    setAuthSubmitState("idle");
    setAuthForm((current) => ({ ...current, [field]: value }));
  }

  function updateProfileField<K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  function updateAccessField<K extends keyof AccessFormState>(field: K, value: AccessFormState[K]) {
    setAccessForm((current) => ({ ...current, [field]: value }));
  }

  function updatePrivacyField<K extends keyof PrivacyFormState>(field: K, value: PrivacyFormState[K]) {
    setPrivacyForm((current) => ({ ...current, [field]: value }));
  }

  function handleBack() {
    if (view === "reset_password") {
      window.history.replaceState({}, "", window.location.pathname);
      setPasswordRecoveryMode(false);
      go("home");
      return;
    }

    if (view === "checkout") {
      go("pro");
      return;
    }

    if (view === "profile_settings") {
      go("profile");
      return;
    }

    go("home");
  }

  function scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMarketingMenuOpen(false);
  }

  function exitPublicMode() {
    window.history.replaceState({}, "", window.location.pathname);
    setPublicState({ shareId: null, wishlist: null, loading: false, notFound: false });
  }

  function openAvatarPicker() {
    avatarInputRef.current?.click();
  }

  async function handleAvatarSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSyncError("Selecione uma imagem valida para a foto de perfil.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSyncError("A foto de perfil deve ter no maximo 5 MB.");
      return;
    }

    try {
      const preview = await readFileAsDataUrl(file);
      setProfileAvatarFile(file);
      setProfileAvatarPreview(preview);
      setProfileForm((current) => ({ ...current, avatarUrl: preview }));
      setSyncError("");
    } catch {
      setSyncError("Não foi possível carregar a imagem agora. Use JPG, PNG, WebP, HEIC ou HEIF.");
    }
  }

  async function handleShareCurrentList() {
    if (sharing) return;

    const activeWishlist = isRemoteMode
      ? remote.wishlists.find((wishlist) => wishlist.id === remote.selectedWishlistId) ?? null
      : null;
    let activeShareId = activeWishlist?.share_id ?? (isRemoteMode ? null : localListId);

    if (!activeShareId || (isRemoteMode && !activeWishlist)) {
      setSyncError("Não foi possível gerar o link da lista agora.");
      return;
    }

    const shareTitle = isRemoteMode
      ? currentListTitle(remote, isRemoteMode, localListTitle)
      : localListTitle;

    try {
      setSharing(true);
      setSyncError("");

      if (isRemoteMode) {
        const sharedWishlist = await publishWishlistForSharing(activeWishlist!.id);
        activeShareId = sharedWishlist.share_id;
      }

      setShareSheet({ url: buildPublicShareUrl(activeShareId), title: shareTitle });
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSharing(false);
    }
  }

  async function handleNativeShare() {
    if (!shareSheet) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Wishly · ${shareSheet.title}`,
          text: `Veja a lista ${shareSheet.title} no Wishly.`,
          url: shareSheet.url,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareSheet.url);
      } else {
        window.prompt("Copie o link da lista:", shareSheet.url);
      }

      setAuthMessage("Link da lista pronto para compartilhar.");
      setSyncError("");
      setShareSheet(null);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setSyncError("Não foi possível compartilhar a lista agora.");
    }
  }

  async function handleCopyShareLink() {
    if (!shareSheet) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareSheet.url);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2400);
      } else {
        window.prompt("Copie o link da lista:", shareSheet.url);
      }
      setSyncError("");
    } catch {
      setSyncError("Não foi possível copiar o link agora.");
    }
  }

  async function handleReservePublicWish(wish: DbWish, details: ReserveDetails) {
    if (!publicState.shareId) throw new Error("Não foi possível identificar a lista compartilhada.");

    try {
      setReserving(true);
      setSyncError("");
      await reservePublicGift({
        shareId: publicState.shareId,
        giftId: wish.id,
        reserverName: details.name,
        reserverEmail: details.email,
        reserverMessage: details.message,
      });

      // Reflete a reserva na hora para o item sair da lista de disponíveis.
      setPublicState((current) =>
        current.wishlist
          ? {
              ...current,
              wishlist: {
                ...current.wishlist,
                gifts: current.wishlist.gifts.map((gift) =>
                  gift.id === wish.id ? { ...gift, status: "reserved" as const } : gift,
                ),
              },
            }
          : current,
      );
    } finally {
      setReserving(false);
    }
  }

  async function handleBuyPublicWish(wish: DbWish) {
    if (!publicState.shareId) {
      openLink(getWishPurchaseUrl(wish));
      return;
    }

    try {
      setSyncing(true);
      setSyncError("");
      const redirect = await resolvePublicGiftRedirect({
        shareId: publicState.shareId,
        giftId: wish.id,
        locale: publicState.wishlist?.locale ?? "pt-BR",
      });
      openLink(redirect.url);
    } catch (error) {
      setSyncError(getErrorMessage(error));
      openLink(getWishPurchaseUrl(wish));
    } finally {
      setSyncing(false);
    }
  }

  async function refreshRemoteState(nextSession: Session | null) {
    if (!supabaseEnabled || !nextSession?.user) {
      setRemote({ wishlists: [], selectedWishlistId: null, gifts: [], isAdmin: false, meliConnection: null });
      setAdminQueue([]);
      setAdminDeletionRequests([]);
      setRemoteReady(true);
      return;
    }

    setSyncing(true);
    setSyncError("");
    setRemoteReady(false);

    try {
      const context = await loadViewerContext(nextSession.user);
      const selectedWishlistId =
        remote.selectedWishlistId && context.wishlists.some((wishlist) => wishlist.id === remote.selectedWishlistId)
          ? remote.selectedWishlistId
          : context.wishlists[0]?.id ?? null;
      const gifts = selectedWishlistId ? await loadWishlistGifts(selectedWishlistId) : [];
      const [queue, deletionRequests] = context.isAdmin
        ? await Promise.all([loadAdminAffiliateQueue(), loadAdminAccountDeletionRequests()])
        : [[], []];

      setRemote({
        wishlists: context.wishlists,
        selectedWishlistId,
        gifts,
        isAdmin: context.isAdmin,
        meliConnection: context.meliConnection,
      });
      setAdminQueue(queue);
      setAdminDeletionRequests(deletionRequests);
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
      setRemoteReady(true);
    }
  }

  async function handleSelectRemoteWishlist(wishlistId: string) {
    if (!isRemoteMode) return;

    try {
      setSyncing(true);
      setSyncError("");
      const gifts = await loadWishlistGifts(wishlistId);
      setRemote((current) => ({
        ...current,
        selectedWishlistId: wishlistId,
        gifts,
      }));
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function handleBuyWish(wish: LocalWish | DbWish) {
    if (isRemoteMode && !isLocalWish(wish)) {
      const selectedWishlist = remote.wishlists.find((wishlist) => wishlist.id === wish.wishlist_id);
      if (!selectedWishlist) {
        openLink(getWishPurchaseUrl(wish));
        return;
      }

      try {
        setSyncing(true);
        setSyncError("");
        const redirect = await resolvePublicGiftRedirect({
          shareId: selectedWishlist.share_id,
          giftId: wish.id,
          locale: "pt-BR",
        });
        openLink(redirect.url);
      } catch (error) {
        setSyncError(getErrorMessage(error));
        openLink(getWishPurchaseUrl(wish));
      } finally {
        setSyncing(false);
      }
      return;
    }

    openLink(getWishPurchaseUrl(wish));
  }

  async function handleAddWish() {
    const targetWishlistId = resolveAddWishTargetId({
      requestedWishlistId: addWishTargetId,
      availableWishlistIds: remote.wishlists.map((wishlist) => wishlist.id),
      isRemoteMode,
      localWishlistId: localListId,
    });

    if (!targetWishlistId) {
      setSyncError("Escolha a lista em que deseja salvar este item.");
      return;
    }

    const submissionReadiness = getWishSubmissionReadiness({
      title: formState.title,
      productUrl: formState.productUrl,
      extractionStatus: extractionState.status,
      extractedUrl: extractionState.extractedUrl,
      syncing,
    });
    if (!submissionReadiness.canSubmit) {
      setSyncError(submissionReadiness.reason || "Revise o item antes de salvar.");
      return;
    }

    const title = formState.title.trim();
    const priceInCents = parsePriceInputToCents(formState.currentPrice);
    const canonicalOrOriginalUrl = formState.canonicalUrl.trim() || formState.productUrl.trim();
    const submissionFingerprint = buildWishSubmissionFingerprint({
      wishlistId: targetWishlistId,
      requestedUrl: formState.productUrl.trim() || canonicalOrOriginalUrl,
      title,
      canonicalUrl: canonicalOrOriginalUrl,
    });

    if (!addWishSubmissionLock.current.start(submissionFingerprint)) {
      return;
    }

    if (isRemoteMode) {
      try {
        setSyncing(true);
        setSyncError("");

        const primaryImage = getPrimaryProductImage(formState.images);
        await createGift({
          wishlistId: targetWishlistId,
          name: title,
          description: formState.note.trim(),
          storeUrl: canonicalOrOriginalUrl,
          priority: mapPriorityToDb(selectedPriority),
          imageUrl: primaryImage?.url || formState.imageUrl.trim() || null,
          images: formState.images,
          removedImageUrls: formState.removedImageUrls,
          estimatedPriceInCents: priceInCents,
          currency: formState.currency.trim() || "BRL",
          autofill: extractionState.preview
            ? {
                requestedUrl: formState.productUrl.trim() || canonicalOrOriginalUrl,
                canonicalUrl: extractionState.preview.canonicalUrl,
                provider: extractionState.preview.provider,
                storeName: extractionState.preview.storeName,
                sellerName: extractionState.preview.sellerName,
                externalProductId: extractionState.preview.externalProductId,
                externalVariantId: extractionState.preview.externalVariantId,
                availability: extractionState.preview.availability,
                selectedVariant: extractionState.preview.selectedVariant,
                imageUrl: extractionState.preview.imageUrl,
                imageUrls: extractionState.preview.imageUrls,
                currentPriceInCents: extractionState.preview.currentPriceInCents,
                originalPriceInCents: extractionState.preview.originalPriceInCents,
                pricing: buildPricingFromForm(formState, extractionState.preview.pricing),
                extractedAt: extractionState.preview.extractedAt,
                confidence: extractionState.preview.confidence,
                warnings: extractionState.preview.warnings,
                status: extractionState.status === "success"
                  ? "success"
                  : extractionState.status === "partial"
                    ? "partial"
                    : extractionState.status === "error"
                      ? extractionState.errorCode === "timeout"
                        ? "timeout"
                        : "failed"
                      : "pending",
                errorCode: extractionState.errorCode,
                errorMessage: extractionState.status === "error" ? extractionState.message : null,
                rawPayload: extractionState.preview.rawPayload ?? extractionState.preview,
              }
            : formState.productUrl.trim()
              ? {
                  requestedUrl: formState.productUrl.trim(),
                  canonicalUrl: formState.canonicalUrl.trim() || null,
                  provider: null,
                  storeName: formState.storeName.trim() || null,
                  sellerName: null,
                  externalProductId: formState.externalProductId.trim() || null,
                  externalVariantId: formState.externalVariantId.trim() || null,
                  availability: formState.availability,
                  selectedVariant: parseSelectedVariantText(formState.selectedVariantText),
                  imageUrl: formState.imageUrl.trim() || null,
                  imageUrls: parseImageUrlsText(formState.imageUrlsText),
                  currentPriceInCents: priceInCents,
                  originalPriceInCents: parsePriceInputToCents(formState.originalPrice),
                  pricing: buildPricingFromForm(formState, null),
                  extractedAt: null,
                  confidence: null,
                  warnings: [],
                  status: extractionState.status === "error"
                    ? extractionState.errorCode === "timeout"
                      ? "timeout"
                      : "failed"
                    : "pending",
                  errorCode: extractionState.errorCode,
                  errorMessage: extractionState.status === "error" ? extractionState.message : null,
                  rawPayload: {},
                }
              : undefined,
        });

        addWishSubmissionLock.current.finish(true);

        try {
          const gifts = await loadWishlistGifts(targetWishlistId);
          setRemote((current) => ({
            ...current,
            selectedWishlistId: targetWishlistId,
            gifts,
          }));
        } catch (refreshError) {
          console.warn("[Wishly] gift saved but list refresh failed", refreshError);
          setSyncError("O item foi salvo, mas a lista não atualizou agora. Recarregue a página para vê-lo.");
        }

        setFormState(initialAddWishFormState);
        setAddWishTargetId(null);
        setExtractionState({ status: "idle", message: "", provider: null, preview: null, extractedUrl: null, errorCode: null });
        setSelectedPriority("Alta");
        go("list");
        return;
      } catch (error) {
        addWishSubmissionLock.current.finish(false);
        setSyncError(getErrorMessage(error));
      } finally {
        setSyncing(false);
      }
    }

    const linkData = analyzeProductUrl(formState.productUrl);
    const nextWishId = getNextId(localWishes);
    const createdWish: LocalWish = {
      id: nextWishId,
      title,
      store: formState.storeName.trim() || getStoreLabel(linkData.source),
      price: formState.currentPrice.trim() || "Adicionar preço",
      image: getPrimaryProductImage(formState.images)?.url || formState.imageUrl.trim() || null,
      priority: selectedPriority,
      originalUrl: linkData.originalUrl,
      resolvedUrl: formState.canonicalUrl.trim() || linkData.resolvedUrl,
      affiliateUrl: null,
      source: linkData.source,
      affiliateStatus: linkData.affiliateStatus,
      status: formState.note.trim() ? "Com nota" : undefined,
    };

    setLocalWishes([createdWish, ...localWishes]);

    if (createdWish.source === "mercado_livre") {
      const nextTaskId = String(getNextId(localAffiliateTasks));
      const task: LocalAffiliateTask = {
        id: Number(nextTaskId),
        giftId: createdWish.id,
        wishlistId: localListId,
        wishlistName: localListName,
        itemTitle: createdWish.title,
        originalUrl: createdWish.originalUrl,
        resolvedUrl: createdWish.resolvedUrl,
        source: createdWish.source,
        status: "pending",
        createdByUserName: localCreatorName,
        createdAt: new Date().toISOString(),
        completedAt: null,
        completedByAdminName: null,
      };
      setLocalAffiliateTasks([task, ...localAffiliateTasks]);
      setDraftAffiliateUrls((current) => ({ ...current, [nextTaskId]: "" }));
    }

    setFormState(initialAddWishFormState);
    setAddWishTargetId(null);
    setExtractionState({ status: "idle", message: "", provider: null, preview: null, extractedUrl: null, errorCode: null });
    setSelectedPriority("Alta");
    addWishSubmissionLock.current.finish(true);
    go("list");
  }

  /**
   * Usa um modelo: cria a lista já com os produtos curados dentro.
   *
   * Sem sessão, guardamos o modelo escolhido e aplicamos depois do cadastro —
   * assim a pessoa não perde a escolha no meio do fluxo de conta.
   */
  async function handleUseTemplate(template: ListTemplate) {
    if (!isRemoteMode) {
      window.localStorage.setItem(PENDING_TEMPLATE_KEY, template.id);
      beginCreateListFlow();
      setAuthMessage(`Crie sua conta para montar "${template.title}" com os itens já dentro.`);
      go("home");
      return;
    }

    try {
      setApplyingTemplateId(template.id);
      setSyncError("");
      const created = await createWishlistFromTemplate({ templateId: template.id });
      const context = session?.user ? await loadViewerContext(session.user) : null;
      const gifts = await loadWishlistGifts(created.wishlist_id);

      setRemote((current) => ({
        ...current,
        wishlists: context?.wishlists ?? current.wishlists,
        selectedWishlistId: created.wishlist_id,
        gifts,
      }));
      setAuthMessage(`"${created.title}" criada com ${formatWishCount(created.item_count)}.`);
      go("list");
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setApplyingTemplateId(null);
    }
  }

  async function refreshListTemplates() {
    // Admin também vê rascunhos; o restante do app só vê publicados.
    const templates = await loadListTemplates({ includeUnpublished: remote.isAdmin });
    setListTemplates(templates);
  }

  async function handleSaveTemplate(input: {
    id?: string;
    title: string;
    description: string;
    coverImageUrl: string;
    published: boolean;
  }) {
    try {
      setSyncing(true);
      setSyncError("");
      const coverImageUrl = input.coverImageUrl.trim();
      if (coverImageUrl && !isValidHttpUrl(coverImageUrl)) {
        throw new Error("Informe uma URL válida para a capa do modelo.");
      }

      if (input.published) {
        const template = input.id ? listTemplates.find((candidate) => candidate.id === input.id) : null;
        if (!template || template.items.length === 0) {
          throw new Error("Adicione os produtos antes de publicar o modelo.");
        }
        if (template.items.some((item) => !item.affiliate_url?.trim())) {
          throw new Error("Todos os produtos precisam de link de afiliado antes da publicação.");
        }
      }

      await saveListTemplate({
        id: input.id,
        slug: slugifyTemplateTitle(input.title),
        title: input.title,
        description: input.description,
        coverImageUrl,
        published: input.published,
      });
      await refreshListTemplates();
      setAuthMessage("Modelo salvo.");
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    try {
      setSyncing(true);
      setSyncError("");
      await deleteListTemplate(templateId);
      await refreshListTemplates();
      setAuthMessage("Modelo excluído.");
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddTemplateItem(input: {
    templateId: string;
    name: string;
    productUrl: string;
    affiliateUrl: string;
    storeName: string;
    imageUrl: string;
    price: string;
  }) {
    try {
      setSyncing(true);
      setSyncError("");
      if (!isValidHttpUrl(input.productUrl.trim())) {
        throw new Error("Informe uma URL válida para o produto.");
      }
      if (!isValidHttpUrl(input.affiliateUrl.trim())) {
        throw new Error("Informe o link de afiliado real antes de salvar o item.");
      }
      if (input.imageUrl.trim() && !isValidHttpUrl(input.imageUrl.trim())) {
        throw new Error("Informe uma URL válida para a imagem do produto.");
      }

      const cents = parsePriceInputToCents(input.price);
      await addListTemplateItem({
        templateId: input.templateId,
        name: input.name.trim(),
        productUrl: input.productUrl.trim(),
        affiliateUrl: input.affiliateUrl,
        storeName: input.storeName,
        imageUrl: input.imageUrl,
        estimatedPrice: cents == null ? null : cents / 100,
        position: listTemplates.find((template) => template.id === input.templateId)?.items.length ?? 0,
      });
      await refreshListTemplates();
      setAuthMessage("Item adicionado ao modelo.");
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function handleDeleteTemplateItem(itemId: string) {
    try {
      setSyncing(true);
      setSyncError("");
      await deleteListTemplateItem(itemId);
      await refreshListTemplates();
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  /**
   * Salva foto e/ou preço de um desejo já existente.
   *
   * Permite adicionar com pressa e completar depois, em vez de travar a inclusão
   * quando o preenchimento automático não trouxe tudo.
   */
  async function handleCompleteWish(wish: LocalWish | DbWish, values: { imageUrl: string; priceText: string }) {
    const imageUrl = values.imageUrl.trim();
    const priceInCents = parsePriceInputToCents(values.priceText);

    if (isRemoteMode && !isLocalWish(wish)) {
      try {
        setSyncing(true);
        setSyncError("");
        await updateGift({
          giftId: wish.id,
          imageUrl: imageUrl || null,
          ...(priceInCents != null ? { priceInCents, currency: getWishCurrency(wish) } : {}),
        });
        if (remote.selectedWishlistId) {
          const gifts = await loadWishlistGifts(remote.selectedWishlistId);
          setRemote((current) => ({ ...current, gifts }));
        }
        setCompleteWishTarget(null);
        setAuthMessage("Desejo atualizado.");
      } catch (error) {
        setSyncError(getErrorMessage(error));
      } finally {
        setSyncing(false);
      }
      return;
    }

    // Modo local: atualiza o item no navegador.
    setLocalWishes((current) =>
      current.map((item) =>
        getWishId(item) === getWishId(wish)
          ? {
              ...item,
              image: imageUrl || item.image,
              price: priceInCents != null ? formatCurrency(priceInCents / 100, "BRL") : item.price,
            }
          : item,
      ),
    );
    setCompleteWishTarget(null);
    setSyncError("");
    setAuthMessage("Desejo atualizado.");
  }

  async function handleEditWish(
    wish: LocalWish | DbWish,
    values: { title: string; note: string; productUrl: string; imageUrl: string; priceText: string; priority: Priority },
  ) {
    const title = values.title.trim();
    if (!title) {
      setSyncError("Informe o nome do desejo.");
      return;
    }

    const priceInCents = parsePriceInputToCents(values.priceText);
    if (values.priceText.trim() && priceInCents == null) {
      setSyncError("Informe um preço válido ou deixe o campo em branco.");
      return;
    }
    const productUrl = values.productUrl.trim();
    const imageUrl = values.imageUrl.trim();

    if (isRemoteMode && !isLocalWish(wish)) {
      try {
        setSyncing(true);
        setSyncError("");
        await updateGift({
          giftId: wish.id,
          name: title,
          description: values.note.trim() || null,
          storeUrl: productUrl || null,
          imageUrl: imageUrl || null,
          ...(values.priceText.trim() ? { priceInCents } : {}),
          currency: getWishCurrency(wish),
          priority: mapPriorityToDb(values.priority),
        });
        if (remote.selectedWishlistId) {
          const gifts = await loadWishlistGifts(remote.selectedWishlistId);
          setRemote((current) => ({ ...current, gifts }));
        }
        setEditWishTarget(null);
        setAuthMessage("Desejo atualizado.");
      } catch (error) {
        setSyncError(getErrorMessage(error));
      } finally {
        setSyncing(false);
      }
      return;
    }

    setLocalWishes((current) =>
      current.map((item) =>
        getWishId(item) === getWishId(wish)
          ? {
              ...item,
              title,
              status: values.note.trim() || item.status,
              originalUrl: productUrl || item.originalUrl,
              resolvedUrl: productUrl || item.resolvedUrl,
              image: imageUrl || item.image,
              price: priceInCents != null ? formatCurrency(priceInCents / 100, "BRL") : item.price,
              priority: values.priority,
            }
          : item,
      ),
    );
    setEditWishTarget(null);
    setSyncError("");
    setAuthMessage("Desejo atualizado.");
  }

  async function handleMarkWishPurchased(wish: LocalWish | DbWish) {
    if (isRemoteMode && !isLocalWish(wish)) {
      try {
        setSyncing(true);
        setSyncError("");
        await updateGift({ giftId: wish.id, status: "purchased" });
        if (remote.selectedWishlistId) {
          const gifts = await loadWishlistGifts(remote.selectedWishlistId);
          setRemote((current) => ({ ...current, gifts }));
        }
        setAuthMessage("Desejo marcado como comprado.");
      } catch (error) {
        setSyncError(getErrorMessage(error));
      } finally {
        setSyncing(false);
      }
      return;
    }

    setLocalWishes((current) =>
      current.map((item) => (getWishId(item) === getWishId(wish) ? { ...item, status: "Comprado" } : item)),
    );
    setAuthMessage("Desejo marcado como comprado.");
  }

  async function handleDeleteWish(wish: LocalWish | DbWish) {
    if (!window.confirm(`Excluir "${getWishTitle(wish)}" da lista?`)) return;

    if (isRemoteMode && !isLocalWish(wish)) {
      try {
        setSyncing(true);
        setSyncError("");
        await deleteGift(wish.id);
        if (remote.selectedWishlistId) {
          const gifts = await loadWishlistGifts(remote.selectedWishlistId);
          setRemote((current) => ({ ...current, gifts }));
        }
        setAuthMessage("Desejo excluído.");
      } catch (error) {
        setSyncError(getErrorMessage(error));
      } finally {
        setSyncing(false);
      }
      return;
    }

    setLocalWishes((current) => current.filter((item) => getWishId(item) !== getWishId(wish)));
    setAuthMessage("Desejo excluído.");
  }

  async function handleDeleteList() {
    if (isRemoteMode) {
      const wishlistId = remote.selectedWishlistId;
      if (!wishlistId) {
        setSyncError("Selecione uma lista antes de excluir.");
        return;
      }

      try {
        setSyncing(true);
        setSyncError("");
        await deleteWishlist(wishlistId);

        const remaining = remote.wishlists.filter((wishlist) => wishlist.id !== wishlistId);
        const nextSelectedId = remaining[0]?.id ?? null;
        // Os desejos em memória são da lista excluída; recarregamos os da próxima.
        const nextGifts = nextSelectedId ? await loadWishlistGifts(nextSelectedId) : [];

        setRemote((current) => ({
          ...current,
          wishlists: remaining,
          selectedWishlistId: nextSelectedId,
          gifts: nextGifts,
        }));
        setDeleteListConfirmOpen(false);
        setCreateListMode("create");
        setCreateListForm({ title: "", coverFile: null, coverPreview: null });
        setAuthMessage("Lista excluída.");
        go(nextSelectedId ? "list" : "home");
      } catch (error) {
        setSyncError(getErrorMessage(error));
      } finally {
        setSyncing(false);
      }
      return;
    }

    // Modo local: só existe uma lista, então voltamos ao estado inicial vazio.
    setLocalWishes([]);
    setLocalListTitle(localListName);
    setLocalListCoverUrl(buildDefaultListCover(localListName));
    setPriceAlerts({});
    setDeleteListConfirmOpen(false);
    setCreateListMode("create");
    setCreateListForm({ title: "", coverFile: null, coverPreview: null });
    setSyncError("");
    setAuthMessage("Lista excluída.");
    go("home");
  }

  async function handleCreateWishlist() {
    const title = createListForm.title.trim();

    if (!title) {
      setSyncError("Escreva o nome da lista antes de salvar.");
      return;
    }

    if (isRemoteMode) {
      if (createListMode === "edit" && remote.selectedWishlistId) {
        try {
          setSyncing(true);
          setSyncError("");
          const updatedWishlist = await updateWishlistDetails({
            wishlistId: remote.selectedWishlistId,
            title,
            coverFile: createListForm.coverFile,
          });
          setRemote((current) => ({
            ...current,
            wishlists: current.wishlists.map((wishlist) =>
              wishlist.id === updatedWishlist.id ? updatedWishlist : wishlist,
            ),
          }));
          setCreateListForm({ title: "", coverFile: null, coverPreview: null });
          setAuthMessage("Lista atualizada.");
          setCreateListMode("create");
          go("list");
          return;
        } catch (error) {
          setSyncError(getErrorMessage(error));
          return;
        } finally {
          setSyncing(false);
        }
      }

      try {
        setSyncing(true);
        setSyncError("");
        const wishlist = await createWishlist({
          title,
          coverFile: createListForm.coverFile,
        });
        const gifts = await loadWishlistGifts(wishlist.id);
        setRemote((current) => ({
          ...current,
          wishlists: [wishlist, ...current.wishlists],
          selectedWishlistId: wishlist.id,
          gifts,
        }));
        setCreateListForm({ title: "", coverFile: null, coverPreview: null });
        setAuthMessage("");
        setCreateListMode("create");
        setAddWishTargetId(wishlist.id);
        setAddWishReturnView("list");
        go("add");
        return;
      } catch (error) {
        setSyncError(getErrorMessage(error));
        return;
      } finally {
        setSyncing(false);
      }
    }

    setLocalListTitle(title);
    if (createListForm.coverPreview) {
      setLocalListCoverUrl(createListForm.coverPreview);
    } else if (createListMode === "create") {
      setLocalListCoverUrl(buildDefaultListCover(title));
    }
    setCreateListForm({ title: "", coverFile: null, coverPreview: null });
    setAuthMessage("");
    setSyncError("");
    setCreateListMode("create");
    window.localStorage.removeItem(POST_AUTH_VIEW_KEY);
    if (createListMode === "edit") {
      go("list");
    } else {
      setAddWishTargetId(localListId);
      setAddWishReturnView("list");
      go("add");
    }
  }

  async function handleRemoteAdminUpdate(giftId: string, status: "generated" | "failed" | "fallback") {
    try {
      setSyncing(true);
      setSyncError("");
      await updateAdminAffiliateLink({
        giftId,
        affiliateUrl: draftAffiliateUrls[giftId] ?? "",
        status,
      });
      await refreshRemoteState(session);
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function handleRemoteDeletionRequestUpdate(requestId: string, status: "processed" | "cancelled") {
    try {
      setSyncing(true);
      setSyncError("");
      await processAdminAccountDeletionRequest({
        requestId,
        status,
      });
      await refreshRemoteState(session);
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  function handleLocalAdminUpdate(taskId: string, status: LocalAffiliateTaskStatus) {
    const numericId = Number(taskId);
    const task = localAffiliateTasks.find((item) => item.id === numericId);
    if (!task) return;

    if (status === "completed") {
      const affiliateUrl = draftAffiliateUrls[taskId]?.trim();
      if (!affiliateUrl) return;

      setLocalAffiliateTasks((current) =>
        current.map((item) =>
          item.id === numericId
            ? { ...item, status: "completed", completedAt: new Date().toISOString(), completedByAdminName: localAdminName }
            : item,
        ),
      );

      setLocalWishes((current) =>
        current.map((wish) =>
          wish.id === task.giftId ? { ...wish, affiliateUrl, affiliateStatus: "generated" } : wish,
        ),
      );
      return;
    }

    const nextStatus = status === "invalid" ? "invalid" : "unavailable";
    setLocalAffiliateTasks((current) =>
      current.map((item) =>
        item.id === numericId
          ? { ...item, status, completedAt: new Date().toISOString(), completedByAdminName: localAdminName }
          : item,
      ),
    );
    setLocalWishes((current) =>
      current.map((wish) => (wish.id === task.giftId ? { ...wish, affiliateStatus: nextStatus } : wish)),
    );
  }

  async function handleSubmitAuth() {
    if (syncing) return;

    try {
      setSyncing(true);
      setAuthMessage("");
      setSyncError("");
      setAuthSubmitState("submitting");
      trackAuthEvent("login_started");

      const email = authForm.email.trim();
      const password = authForm.password;
      const fullName = authForm.fullName.trim();

      if (!email || !password) {
        throw new Error("Preencha e-mail e senha para continuar.");
      }

      if (!isValidEmail(email)) {
        throw new Error("Digite um e-mail válido para continuar.");
      }

      if (authPanelMode === "create") {
        if (!fullName) {
          throw new Error("Preencha seu nome para criar a conta.");
        }

        if (password.length < 6) {
          throw new Error("Use uma senha com pelo menos 6 caracteres.");
        }

        if (password !== authForm.confirmPassword.trim()) {
          throw new Error("A confirmação da senha não confere.");
        }

        const result = await withTimeout(signUpWithPassword({
          email,
          password,
          fullName,
        }), AUTH_REQUEST_TIMEOUT_MS);

        if (!result.session) {
          setAuthMessage(`Conta criada para ${email}. Confirme seu e-mail para entrar e criar sua lista.`);
        }
        trackAuthEvent("login_success");
        setAuthSubmitState("success");
        return;
      }

      await withTimeout(signInWithPassword(email, password), AUTH_REQUEST_TIMEOUT_MS);
      trackAuthEvent("login_success");
      setAuthSubmitState("success");
    } catch (error) {
      trackAuthEvent(error instanceof Error && error.message.includes("demorou") ? "login_timeout" : "login_failed");
      setSyncError(getErrorMessage(error));
      setAuthSubmitState("error");
    } finally {
      setSyncing(false);
    }
  }

  async function handleForgotPassword() {
    if (syncing) return;

    try {
      setSyncing(true);
      setAuthMessage("");
      setSyncError("");
      const email = authForm.email.trim();

      if (!isValidEmail(email)) {
        throw new Error("Digite seu e-mail para receber o link de recuperação.");
      }

      await withTimeout(resetPasswordForEmail(email), AUTH_REQUEST_TIMEOUT_MS);
      trackAuthEvent("password_recovery_requested");
      setAuthMessage("Se esse e-mail estiver cadastrado, enviaremos um link para criar uma nova senha.");
      setAuthSubmitState("success");
    } catch (error) {
      setSyncError(getErrorMessage(error));
      setAuthSubmitState("error");
    } finally {
      setSyncing(false);
    }
  }

  async function handleUpdateRecoveredPassword() {
    if (syncing) return;

    const newPassword = passwordResetForm.newPassword.trim();
    const confirmNewPassword = passwordResetForm.confirmNewPassword.trim();

    if (!newPassword || !confirmNewPassword) {
      setSyncError("Preencha a nova senha e a confirmação.");
      return;
    }

    if (newPassword.length < 6) {
      setSyncError("Use uma nova senha com pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setSyncError("A confirmação da nova senha não confere.");
      return;
    }

    try {
      setSyncing(true);
      setSyncError("");
      setAuthMessage("");
      await updateRecoveredPassword(newPassword);
      setPasswordRecoveryMode(false);
      setPasswordResetForm({ newPassword: "", confirmNewPassword: "" });
      window.history.replaceState({}, "", window.location.pathname);
      setAuthMessage("Senha atualizada com sucesso. Você já pode continuar usando sua conta.");
      setView("home");
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveProfile() {
    const fullName = profileForm.fullName.trim();
    if (!fullName) {
      setSyncError("Preencha seu nome para salvar o perfil.");
      return;
    }

    try {
      setSyncing(true);
      setSyncError("");
      setAuthMessage("");

      if (isRemoteMode) {
        await updateViewerProfile({
          fullName,
          avatarFile: profileAvatarFile,
        });

        const refreshed = await getInitialSession();
        setSession(refreshed);
        await refreshRemoteState(refreshed);
      } else {
        setLocalProfile({
          fullName,
          email: profileForm.email.trim() || localProfile.email,
          avatarUrl: profileAvatarPreview ?? profileForm.avatarUrl ?? localProfile.avatarUrl,
          privacy: localProfile.privacy,
          deletionRequestedAt: localProfile.deletionRequestedAt,
        });
      }

      setProfileAvatarFile(null);
      setProfileAvatarPreview(null);
      setAuthMessage("Perfil atualizado.");
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveEmail() {
    const nextEmail = accessForm.nextEmail.trim().toLowerCase();

    if (!nextEmail) {
      setSyncError("Preencha o novo e-mail para continuar.");
      return;
    }

    if (nextEmail === viewerProfile.email.trim().toLowerCase()) {
      setSyncError("Digite um e-mail diferente do atual.");
      return;
    }

    if (!isRemoteMode) {
      setLocalProfile((current) => ({ ...current, email: nextEmail }));
      setAuthMessage("E-mail atualizado no modo local.");
      return;
    }

    try {
      setSyncing(true);
      setSyncError("");
      setAuthMessage("");
      await updateViewerEmail(nextEmail);
      setAuthMessage(`Pedido de troca enviado para ${nextEmail}. Confirme o novo e-mail para concluir a alteração.`);
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function handleSavePassword() {
    const currentPassword = accessForm.currentPassword.trim();
    const newPassword = accessForm.newPassword.trim();
    const confirmNewPassword = accessForm.confirmNewPassword.trim();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setSyncError("Preencha senha atual, nova senha e confirmação.");
      return;
    }

    if (newPassword.length < 6) {
      setSyncError("Use uma nova senha com pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setSyncError("A confirmação da nova senha não confere.");
      return;
    }

    if (!isRemoteMode) {
      setAuthMessage("Senha atualizada no modo local.");
      setAccessForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }));
      return;
    }

    try {
      setSyncing(true);
      setSyncError("");
      setAuthMessage("");
      await updateViewerPassword({
        currentPassword,
        nextPassword: newPassword,
      });
      setAuthMessage("Senha atualizada.");
      setAccessForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }));
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function handleSavePrivacy() {
    try {
      setSyncing(true);
      setSyncError("");
      setAuthMessage("");

      if (isRemoteMode) {
        await updateViewerPreferences({
          profileVisibility: privacyForm.profileVisibility,
          defaultListVisibility: privacyForm.defaultListVisibility,
        });

        const refreshed = await getInitialSession();
        setSession(refreshed);
        await refreshRemoteState(refreshed);
      } else {
        setLocalProfile((current) => ({
          ...current,
          privacy: {
            profileVisibility: privacyForm.profileVisibility,
            defaultListVisibility: privacyForm.defaultListVisibility,
          },
        }));
      }

      setAuthMessage("Preferências de privacidade atualizadas.");
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function handleRequestAccountDeletion() {
    if (privacyForm.deleteConfirmText.trim().toUpperCase() !== "EXCLUIR") {
      setSyncError("Digite EXCLUIR para confirmar a solicitação.");
      return;
    }

    try {
      setSyncing(true);
      setSyncError("");
      setAuthMessage("");

      if (isRemoteMode) {
        await requestViewerAccountDeletion();
        const refreshed = await getInitialSession();
        setSession(refreshed);
        await refreshRemoteState(refreshed);
      } else {
        setLocalProfile((current) => ({
          ...current,
          deletionRequestedAt: new Date().toISOString(),
        }));
      }

      setPrivacyForm((current) => ({ ...current, deleteConfirmText: "" }));
      setAuthMessage("Solicitação de exclusão registrada. A conta foi marcada para remoção.");
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function handleConnectMercadoLivre() {
    if (!isRemoteMode) {
      setSyncError("Entre na sua conta antes de conectar o Mercado Livre.");
      return;
    }

    try {
      setMeliConnecting(true);
      setSyncError("");
      setAuthMessage("");

      const authorizationUrl = await getMercadoLivreAuthorizationUrl(`${window.location.origin}/?view=profile_settings`);
      window.location.assign(authorizationUrl);
    } catch (error) {
      setSyncError(getErrorMessage(error));
      setMeliConnecting(false);
    }
  }

  useEffect(() => {
    window.localStorage.setItem("wishly-theme", theme);
  }, [theme]);

  // Modelos publicados: visíveis também para quem ainda não tem conta.
  useEffect(() => {
    let active = true;
    // Admin precisa ver rascunhos para poder publicá-los.
    void loadListTemplates({ includeUnpublished: remote.isAdmin })
      .then((templates) => {
        if (active) setListTemplates(templates);
      })
      .catch(() => {
        if (active) setListTemplates([]);
      });
    return () => {
      active = false;
    };
  }, [remote.isAdmin]);

  // Atalhos de teclado (desktop): colar um link em qualquer lugar abre o cadastro
  // já preenchido, e Cmd/Ctrl+K abre a troca rápida de lista.
  useEffect(() => {
    if (isPublicMode || isMarketingMode) return;

    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
    }

    function handlePaste(event: ClipboardEvent) {
      if (isTypingTarget(event.target)) return;
      const url = extractSharedProductUrl({ text: event.clipboardData?.getData("text") ?? "" });
      if (!url) return;
      event.preventDefault();
      setFormState((current) => ({ ...current, productUrl: url }));
      const contextualWishlistId =
        view === "list" ? (isRemoteMode ? remote.selectedWishlistId : localListId) : isRemoteMode ? null : localListId;
      setAddWishTargetId(contextualWishlistId);
      setAddWishReturnView(contextualWishlistId ? "list" : "home");
      setSyncError("");
      go("add");
      setAuthMessage("Link colado. Confira os dados antes de salvar.");
    }

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setListPaletteOpen((open) => !open);
        return;
      }
      if (event.key === "Escape") setListPaletteOpen(false);
    }

    window.addEventListener("paste", handlePaste);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPublicMode, isMarketingMode, isRemoteMode, remote.selectedWishlistId, view]);

  useEffect(() => {
    window.localStorage.setItem("wishly-price-alerts", JSON.stringify(priceAlerts));
  }, [priceAlerts]);

  useEffect(() => {
    window.localStorage.setItem("wishly-wishes", JSON.stringify(localWishes));
  }, [localWishes]);

  useEffect(() => {
    window.localStorage.setItem("wishly-affiliate-tasks", JSON.stringify(localAffiliateTasks));
  }, [localAffiliateTasks]);

  useEffect(() => {
    window.localStorage.setItem("wishly-local-profile", JSON.stringify(localProfile));
  }, [localProfile]);

  useEffect(() => {
    setProfileForm({
      fullName: viewerProfile.fullName,
      email: viewerProfile.email,
      avatarUrl: profileAvatarPreview ?? viewerProfile.avatarUrl,
    });
  }, [viewerProfile, profileAvatarPreview]);

  useEffect(() => {
    setAccessForm((current) => ({
      ...current,
      nextEmail: viewerProfile.email,
    }));
  }, [viewerProfile.email]);

  useEffect(() => {
    setPrivacyForm((current) => ({
      ...current,
      profileVisibility: viewerProfile.privacy.profileVisibility,
      defaultListVisibility: viewerProfile.privacy.defaultListVisibility,
    }));
  }, [viewerProfile.privacy.defaultListVisibility, viewerProfile.privacy.profileVisibility]);

  useEffect(() => {
    if (view !== "add") return;

    const rawUrl = formState.productUrl.trim();
    if (!isValidHttpUrl(rawUrl)) {
      extractionRequestIdRef.current += 1;
      setExtractionState({ status: "idle", message: "", provider: null, preview: null, extractedUrl: null, errorCode: null });
      return;
    }

    const timeout = window.setTimeout(async () => {
      const requestId = extractionRequestIdRef.current + 1;
      extractionRequestIdRef.current = requestId;
      let progressTimer: number | null = null;
      try {
        setExtractionState({
          status: "loading",
          message: "Buscando dados essenciais do produto",
          provider: null,
          preview: null,
          extractedUrl: rawUrl,
          errorCode: null,
        });

        progressTimer = window.setTimeout(() => {
          if (
            !isAutofillResultCurrent({
              requestId,
              latestRequestId: extractionRequestIdRef.current,
              view,
              productUrl: formState.productUrl,
              requestedUrl: rawUrl,
            })
          ) return;
          setExtractionState((current) => (
            current.status === "loading"
              ? { ...current, message: "Tentando completar imagem, preço e detalhes da loja" }
              : current
          ));
        }, 1800);

        const result = await Promise.race([
          extractProductFromUrl(rawUrl),
          new Promise<ProductExtractionResult>((_, reject) => {
            window.setTimeout(() => reject(new Error("extraction_timeout")), 8500);
          }),
        ]);
        if (
          !isAutofillResultCurrent({
            requestId,
            latestRequestId: extractionRequestIdRef.current,
            view,
            productUrl: formState.productUrl,
            requestedUrl: rawUrl,
          })
        ) return;
        if (progressTimer != null) window.clearTimeout(progressTimer);

        const sanitizedResult = sanitizeMercadoLivrePreview(result);

        const feedback = getExtractionFeedback({
          provider: sanitizedResult.provider,
          warnings: sanitizedResult.warnings,
          partial: sanitizedResult.partial,
          externalProductId: sanitizedResult.externalProductId,
          hasEssentialFields: Boolean(sanitizedResult.title && sanitizedResult.imageUrl && sanitizedResult.currentPriceInCents != null),
        });

        setFormState((current) => mergeExtractedProductIntoForm(current, sanitizedResult));
        setExtractionState({
          status: feedback.status,
          message: feedback.message,
          provider: sanitizedResult.provider,
          preview: { ...sanitizedResult, rawPayload: sanitizedResult.rawPayload ?? { result: sanitizedResult } },
          extractedUrl: rawUrl,
          errorCode: feedback.status === "error" ? "limited_support" : null,
        });
      } catch (error) {
        if (
          !isAutofillResultCurrent({
            requestId,
            latestRequestId: extractionRequestIdRef.current,
            view,
            productUrl: formState.productUrl,
            requestedUrl: rawUrl,
          })
        ) return;
        if (progressTimer != null) window.clearTimeout(progressTimer);
        const isTimeout = error instanceof Error && error.message === "extraction_timeout";
        const sessionExpired =
          error instanceof Error &&
          (
            (error as Error & { code?: string; status?: number }).code === "missing_session" ||
            (error as Error & { code?: string; status?: number }).code === "invalid_session" ||
            (error as Error & { code?: string; status?: number }).status === 401
          );
        setExtractionState({
          status: "error",
          message: sessionExpired
            ? "Sua sessao do Wishly expirou. Entre novamente para continuar com o preenchimento automatico."
            : "Não conseguimos preencher os dados. Complete o nome e confirme a inclusão manual.",
          provider: null,
          preview: null,
          extractedUrl: rawUrl,
          errorCode: sessionExpired ? "session_expired" : isTimeout ? "timeout" : "failed",
        });
      }
    }, 550);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [view, formState.productUrl]);

  useEffect(() => {
    if (!supabaseEnabled) return;

    let active = true;
    getInitialSession().then((nextSession) => {
      if (!active) return;
      setSession(nextSession);
      void refreshRemoteState(nextSession);
    });

    const unsubscribe = listenToAuthChanges((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecoveryMode(true);
        setView("reset_password");
        setSyncError("");
        setAuthMessage("");
      } else if (event === "SIGNED_OUT") {
        setPasswordRecoveryMode(false);
      }

      setSession(nextSession);
      void refreshRemoteState(nextSession);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const syncShareId = () => {
      setPublicState((current) => {
        const nextShareId = readPublicShareId();
        if (current.shareId === nextShareId) return current;
        return {
          shareId: nextShareId,
          wishlist: nextShareId === current.shareId ? current.wishlist : null,
          loading: Boolean(nextShareId),
          notFound: false,
        };
      });
    };

    syncShareId();
    window.addEventListener("popstate", syncShareId);

    return () => {
      window.removeEventListener("popstate", syncShareId);
    };
  }, []);

  useEffect(() => {
    if (!hasPasswordRecoveryParams()) return;

    setPasswordRecoveryMode(true);
    setView("reset_password");
    setSyncError("");
    setAuthMessage("");
  }, []);

  useEffect(() => {
    if (!publicState.shareId || session) {
      if (publicState.wishlist || publicState.loading || publicState.notFound) {
        setPublicState((current) => ({
          shareId: current.shareId,
          wishlist: null,
          loading: false,
          notFound: false,
        }));
      }
      return;
    }

    let active = true;

    setPublicState((current) => ({
      ...current,
      loading: true,
      notFound: false,
    }));

    const load = async () => {
      try {
        const wishlist = supabaseEnabled
          ? await loadPublicWishlist(publicState.shareId!)
          : buildLocalPublicWishlist(publicState.shareId!, localWishes, localListTitle);

        if (!active) return;

        setPublicState((current) => ({
          ...current,
          wishlist,
          loading: false,
          notFound: !wishlist,
        }));
      } catch (error) {
        if (!active) return;

        setPublicState((current) => ({
          ...current,
          wishlist: buildLocalPublicWishlist(publicState.shareId!, localWishes, localListTitle),
          loading: false,
          notFound: !buildLocalPublicWishlist(publicState.shareId!, localWishes, localListTitle),
        }));
        setSyncError(getErrorMessage(error));
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [publicState.shareId, session, localWishes, localListTitle]);

  useEffect(() => {
    if (!session || !remoteReady || passwordRecoveryMode) return;

    // A pessoa escolheu um modelo antes de ter conta: aplicamos agora.
    const pendingTemplateId = window.localStorage.getItem(PENDING_TEMPLATE_KEY);
    if (pendingTemplateId) {
      window.localStorage.removeItem(PENDING_TEMPLATE_KEY);
      window.localStorage.removeItem(POST_AUTH_VIEW_KEY);
      const pendingTemplate = listTemplates.find((template) => template.id === pendingTemplateId);
      if (pendingTemplate) {
        void handleUseTemplate(pendingTemplate);
        return;
      }
    }

    const pendingView = window.localStorage.getItem(POST_AUTH_VIEW_KEY) as View | null;
    if (pendingView === "create_list") {
      window.localStorage.removeItem(POST_AUTH_VIEW_KEY);
      setView("create_list");
      setAuthMessage("");
      return;
    }

    if (view === "home" && remote.wishlists.length === 0) {
      setView("create_list");
    }
  }, [passwordRecoveryMode, session, remoteReady, remote.wishlists.length, view, listTemplates]);

  useEffect(() => {
    document.body.classList.toggle("marketing-body", isMarketingMode);
    return () => {
      document.body.classList.remove("marketing-body");
    };
  }, [isMarketingMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const oauthStatus = url.searchParams.get("meli_oauth");
    const oauthCode = url.searchParams.get("meli_code");
    const targetView = url.searchParams.get("view");

    if (targetView === "profile_settings") {
      setView("profile_settings");
    }

    // Web Share Target: o app foi aberto pelo "compartilhar" de outro app.
    const sharedUrl = extractSharedProductUrl({
      url: url.searchParams.get("shared_url"),
      text: url.searchParams.get("shared_text"),
      title: url.searchParams.get("shared_title"),
    });

    if (sharedUrl) {
      setFormState((current) => ({ ...current, productUrl: sharedUrl }));
      setView("add");
      setAuthMessage("Link recebido. Confira os dados antes de salvar.");
      url.searchParams.delete("shared_url");
      url.searchParams.delete("shared_text");
      url.searchParams.delete("shared_title");
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    }

    if (!oauthStatus) return;

    if (oauthStatus === "success") {
      setAuthMessage(oauthCode === "connected" ? "Mercado Livre conectado com sucesso." : "Conexão com Mercado Livre atualizada.");
      setSyncError("");
      if (session) {
        void refreshRemoteState(session);
      }
    } else {
      setSyncError("Não foi possível concluir a conexão com o Mercado Livre.");
      setAuthMessage("");
    }

    setMeliConnecting(false);
    url.searchParams.delete("meli_oauth");
    url.searchParams.delete("meli_code");
    url.searchParams.delete("view");
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }, [session]);

  if (isPublicMode) {
    return (
      <div className="app-shell public-shell" data-theme={theme}>
        {syncError && (
          <section className="inset-section compact">
            <div className="sync-banner error">{syncError}</div>
          </section>
        )}
        <PublicWishlistPage
          loading={publicState.loading}
          wishlist={publicState.wishlist}
          notFound={publicState.notFound}
          onBackHome={exitPublicMode}
          onBuyWish={(wish) => void handleBuyPublicWish(wish)}
          onReserveWish={handleReservePublicWish}
          reserving={reserving}
          onCreateList={() => {
            exitPublicMode();
            beginCreateListFlow();
          }}
        />
      </div>
    );
  }

  return (
    <div className={`app-shell ${isMarketingMode ? "marketing-shell" : ""} ${isDesktopFlowMode ? "desktop-flow-shell" : ""}`} data-theme={theme}>
      {isMarketingMode ? (
          <MarketingHomePage
            authForm={authForm}
            authMessage={authMessage}
            authError={isMarketingMode ? syncError : ""}
            authSubmitState={authSubmitState}
          authPanelMode={authPanelMode}
          marketingMenuOpen={marketingMenuOpen}
          onCreateList={beginCreateListFlow}
          onLogin={beginLoginFlow}
          onOpenListDemo={() => go("list")}
          onResetAuthFlow={resetAuthFlow}
            onSubmitAuth={() => void handleSubmitAuth()}
            onForgotPassword={() => void handleForgotPassword()}
          onSetAuthField={updateAuthField}
          onToggleMenu={() => setMarketingMenuOpen((current) => !current)}
          syncing={syncing}
          templates={listTemplates}
          onUseTemplate={(template) => void handleUseTemplate(template)}
        />
      ) : (
        <>
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden-file-input"
        onChange={(event) => void handleAvatarSelected(event.target.files)}
      />
      {/* Sidebar exclusiva de desktop: substitui a barra de abas e o FAB de mobile. */}
      <aside className="app-sidebar" aria-label="Navegação do Wishly">
        <button className="brand-lockup app-sidebar-brand" type="button" onClick={() => go("home")} aria-label="Wishly">
          <img className="wordmark" src={images.logo} alt="Wishly" />
        </button>

        <nav className="app-sidebar-nav" aria-label="Seções">
          <SidebarItem active={view === "home"} icon={<Home size={19} />} label="Início" onClick={() => go("home")} />
          <SidebarItem active={view === "list"} icon={<Gift size={19} />} label="Minha lista" onClick={() => go("list")} />
          <SidebarItem active={view === "radar"} icon={<LineChart size={19} />} label="Radar" onClick={() => go("radar")} />
          <SidebarItem active={view === "activity"} icon={<Bell size={19} />} label="Atividade" onClick={() => go("activity")} />
          <SidebarItem
            active={view === "profile" || view === "profile_settings" || view === "pro" || view === "checkout"}
            icon={<User size={19} />}
            label="Perfil"
            onClick={() => go("profile")}
          />
        </nav>

        {homeLists.length > 0 && (
          <div className="app-sidebar-lists">
            <p className="label">Suas listas</p>
            {homeLists.map((list) => (
              <button
                key={list.id}
                className={`app-sidebar-list ${list.isSelected && view === "list" ? "active" : ""}`}
                type="button"
                onClick={() => {
                  if (isRemoteMode) void handleSelectRemoteWishlist(list.id);
                  go("list");
                }}
              >
                <img src={list.coverUrl} alt="" />
                <span>
                  <strong>{list.title}</strong>
                  <small>{list.meta}</small>
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="app-sidebar-actions">
          <button className="secondary-button full" type="button" onClick={beginCreateListFlow}>
            <Plus size={18} />
            Nova lista
          </button>
          <button className="primary-button full" type="button" onClick={() => beginAddWishFlow(null)}>
            <Gift size={18} />
            Adicionar desejo
          </button>
        </div>
      </aside>

      <div className="app-main-column">
      <header className="topbar">
        {view === "home" ? (
          <button className="brand-lockup" type="button" onClick={() => go("home")} aria-label="Wishly Home">
            <img className="avatar" src={viewerProfile.avatarUrl || images.avatar} alt={viewerProfile.fullName} />
            <img className="wordmark" src={images.logo} alt="Wishly" />
          </button>
        ) : (
          <button className="icon-button" type="button" onClick={handleBack} aria-label="Voltar">
            <ChevronLeft size={24} />
          </button>
        )}
        {title &&
          (view === "list" ? (
            <div className="top-title-wrap">
              <span className="top-title-kicker">Lista ativa</span>
              <h1 className="top-title">{title}</h1>
            </div>
          ) : (
            <h1 className="top-title">{title}</h1>
          ))}
        <div className="top-actions">
          {(!supabaseEnabled || remote.isAdmin || localPendingTasks.length > 0) && (
            <button className="icon-button" type="button" onClick={() => go("admin")} aria-label="Abrir fila de afiliados" title="Fila de afiliados">
              <ShieldCheck size={22} />
            </button>
          )}
          <button
            className="icon-button"
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
            title={theme === "light" ? "Modo escuro" : "Modo claro"}
          >
            {theme === "light" ? <Moon size={22} /> : <Sun size={22} />}
          </button>
          {isRemoteMode ? (
            <button className="icon-button primary" type="button" onClick={() => void signOut()} aria-label="Sair">
              <LogOut size={20} />
            </button>
          ) : (
            <button className="icon-button primary" type="button" onClick={() => go("activity")} aria-label="Notificações">
              <Bell size={23} />
            </button>
          )}
        </div>
      </header>

      <main className="screen">
        {syncError && (
          <section className="inset-section compact">
            <div className="sync-banner error">{syncError}</div>
          </section>
        )}
        {authMessage && !isMarketingMode && (
          <section className="inset-section compact">
            <div className="sync-banner success">{authMessage}</div>
          </section>
        )}
        {view === "home" && (
          <HomeScreen
            go={go}
            pendingCount={pendingCount}
            session={session}
            authForm={authForm}
            setAuthField={updateAuthField}
            onCreateList={beginCreateListFlow}
            onLogin={beginLoginFlow}
            authPanelMode={authPanelMode}
            onSubmitAuth={handleSubmitAuth}
            onForgotPassword={() => void handleForgotPassword()}
            syncing={syncing}
            lists={homeLists}
            notices={homeNotices}
            templates={listTemplates}
            applyingTemplateId={applyingTemplateId}
            onUseTemplate={(template) => void handleUseTemplate(template)}
            onOpenList={(listId) => {
              if (isRemoteMode) void handleSelectRemoteWishlist(listId);
              go("list");
            }}
          />
        )}
        {view === "reset_password" && (
          <ResetPasswordScreen
            passwordResetForm={passwordResetForm}
            onChangeField={resetPasswordField}
            onSubmit={() => void handleUpdateRecoveredPassword()}
            syncing={syncing}
          />
        )}
        {view === "create_list" && (
          <CreateListScreen
            formState={createListForm}
            onBack={() => go(createListMode === "edit" ? "list" : "home")}
            onChange={(title) => setCreateListForm((current) => ({ ...current, title }))}
            onSelectCover={(files) => void handleListCoverSelected(files)}
            onSubmit={() => void handleCreateWishlist()}
            onRequestDelete={() => setDeleteListConfirmOpen(true)}
            syncing={syncing}
            mode={createListMode}
          />
        )}
        {view === "list" && (
          <ListScreen
            go={go}
            onAddWish={() => beginAddWishFlow(remote.selectedWishlistId)}
            priceAlerts={priceAlerts}
            onEditAlert={setAlertTarget}
            onCompleteWish={setCompleteWishTarget}
            wishes={currentWishes}
            wishlistTitle={currentListTitle(remote, isRemoteMode, localListTitle)}
            wishlistCoverUrl={isRemoteMode ? currentListCover(remote, localListCoverUrl) : localListCoverUrl}
            wishlists={remote.wishlists}
            selectedWishlistId={remote.selectedWishlistId}
            isRemoteMode={isRemoteMode}
            onSelectWishlist={(wishlistId) => void handleSelectRemoteWishlist(wishlistId)}
            onBuyWish={(wish) => void handleBuyWish(wish)}
            onEditWish={(wish) => setEditWishTarget(wish)}
            onMarkWishPurchased={(wish) => void handleMarkWishPurchased(wish)}
            onDeleteWish={(wish) => void handleDeleteWish(wish)}
            onShare={() => void handleShareCurrentList()}
            sharing={sharing}
            onEditList={beginEditListFlow}
            canEditList
          />
        )}
        {view === "add" && (
          <AddWishScreen
            formState={formState}
            extractionState={extractionState}
            availableLists={homeLists}
            selectedWishlistId={isRemoteMode ? addWishTargetId : localListId}
            onSelectWishlist={setAddWishTargetId}
            onCreateList={beginCreateListFlow}
            onBack={() => go(addWishReturnView)}
            selectedPriority={selectedPriority}
            setFormState={setFormState}
            setSelectedPriority={setSelectedPriority}
            onSubmit={() => void handleAddWish()}
            syncing={syncing}
          />
        )}
        {view === "radar" && (
          <RadarScreen go={go} priceAlerts={priceAlerts} wishes={currentWishes} onEditAlert={setAlertTarget} />
        )}
        {view === "activity" && <ActivityScreen />}
        {view === "admin" && (
          <AdminScreen
            isRemoteMode={isRemoteMode}
            isAdmin={remote.isAdmin}
            remoteQueue={adminQueue}
            remoteDeletionRequests={adminDeletionRequests}
            localTasks={localAffiliateTasks}
            draftAffiliateUrls={draftAffiliateUrls}
            onAffiliateChange={(taskId, value) => setDraftAffiliateUrls((current) => ({ ...current, [taskId]: value }))}
            onRemoteApply={(giftId) => void handleRemoteAdminUpdate(giftId, "generated")}
            onRemoteFail={(giftId) => void handleRemoteAdminUpdate(giftId, "failed")}
            onRemoteDeletionProcess={(requestId) => void handleRemoteDeletionRequestUpdate(requestId, "processed")}
            onRemoteDeletionCancel={(requestId) => void handleRemoteDeletionRequestUpdate(requestId, "cancelled")}
            onLocalApply={(taskId) => handleLocalAdminUpdate(taskId, "completed")}
            onLocalInvalid={(taskId) => handleLocalAdminUpdate(taskId, "invalid")}
            onLocalUnavailable={(taskId) => handleLocalAdminUpdate(taskId, "unavailable")}
            templatesSection={
              <AdminTemplatesSection
                templates={listTemplates}
                busy={syncing}
                onSaveTemplate={(input) => void handleSaveTemplate(input)}
                onDeleteTemplate={(templateId) => void handleDeleteTemplate(templateId)}
                onAddItem={(input) => void handleAddTemplateItem(input)}
                onDeleteItem={(itemId) => void handleDeleteTemplateItem(itemId)}
              />
            }
          />
        )}
        {view === "profile" && (
          <ProfileScreen
            profile={viewerProfile}
            isRemoteMode={isRemoteMode}
            onOpenSettings={() => go("profile_settings")}
            onOpenPro={() => go("pro")}
            onSignOut={() => void signOut()}
          />
        )}
        {view === "profile_settings" && (
          <ProfileSettingsScreen
            profileForm={profileForm}
            accessForm={accessForm}
            privacyForm={privacyForm}
            deletionRequestedAt={viewerProfile.deletionRequestedAt}
            syncing={syncing}
            meliConnecting={meliConnecting}
            isRemoteMode={isRemoteMode}
            isAdmin={remote.isAdmin}
            meliConnection={remote.meliConnection}
            onChangeField={updateProfileField}
            onChangeAccessField={updateAccessField}
            onChangePrivacyField={updatePrivacyField}
            onChoosePhoto={openAvatarPicker}
            onConnectMercadoLivre={() => void handleConnectMercadoLivre()}
            onSave={() => void handleSaveProfile()}
            onSaveEmail={() => void handleSaveEmail()}
            onSavePassword={() => void handleSavePassword()}
            onSavePrivacy={() => void handleSavePrivacy()}
            onRequestDeletion={() => void handleRequestAccountDeletion()}
          />
        )}
        {view === "pro" && <ProScreen go={go} />}
        {view === "checkout" && <CheckoutScreen go={go} />}
        {view === "success" && <SuccessScreen go={go} />}
      </main>
      </div>

      {showFab && (
        <button
          className="fab"
          type="button"
          onClick={() => {
            if (view === "home") {
              beginCreateListFlow();
              return;
            }
            beginAddWishFlow(view === "list" ? remote.selectedWishlistId : null);
          }}
        >
          <Plus size={19} />
          <span>{view === "home" ? "CRIAR NOVA LISTA" : "ADICIONAR DESEJO"}</span>
        </button>
      )}

      {view !== "reset_password" && (
        <nav className="bottom-nav" aria-label="Navegação principal">
          <NavItem active={view === "home"} icon={<Home size={22} />} label="Início" onClick={() => go("home")} />
          <NavItem active={view === "radar"} icon={<LineChart size={22} />} label="Radar" onClick={() => go("radar")} />
          <NavItem active={view === "activity"} icon={<Bell size={22} />} label="Atividade" onClick={() => go("activity")} />
          <NavItem active={view === "profile" || view === "profile_settings" || view === "pro" || view === "checkout"} icon={<User size={22} />} label="Perfil" onClick={() => go("profile")} />
        </nav>
      )}
        </>
      )}

      {listPaletteOpen && (
        <div className="reserve-dialog-backdrop" onClick={() => setListPaletteOpen(false)}>
          <div
            className="reserve-dialog list-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Trocar de lista"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="reserve-dialog-header">
              <div>
                <p className="label">Ir para</p>
                <h2>Suas listas</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setListPaletteOpen(false)} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>
            <div className="list-palette-items">
              {homeLists.map((list) => (
                <button
                  key={list.id}
                  className="app-sidebar-list"
                  type="button"
                  onClick={() => {
                    if (isRemoteMode) void handleSelectRemoteWishlist(list.id);
                    setListPaletteOpen(false);
                    go("list");
                  }}
                >
                  <img src={list.coverUrl} alt="" />
                  <span>
                    <strong>{list.title}</strong>
                    <small>{list.meta}</small>
                  </span>
                </button>
              ))}
              <button
                className="app-sidebar-list"
                type="button"
                onClick={() => {
                  setListPaletteOpen(false);
                  go("create_list");
                }}
              >
                <span>
                  <strong>Criar nova lista</strong>
                  <small>Começar de uma lista vazia</small>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteListConfirmOpen && (
        <ConfirmDeleteListDialog
          listTitle={currentListTitle(remote, isRemoteMode, localListTitle)}
          wishCount={currentWishes.length}
          reservedCount={currentWishes.filter((wish) => getWishStatus(wish) === "Reservado").length}
          deleting={syncing}
          onConfirm={() => void handleDeleteList()}
          onClose={() => setDeleteListConfirmOpen(false)}
        />
      )}

      {completeWishTarget && (
        <CompleteWishDialog
          wish={completeWishTarget}
          saving={syncing}
          onSave={(values) => void handleCompleteWish(completeWishTarget, values)}
          onClose={() => setCompleteWishTarget(null)}
        />
      )}

      {editWishTarget && (
        <EditWishDialog
          wish={editWishTarget}
          saving={syncing}
          onSave={(values) => void handleEditWish(editWishTarget, values)}
          onClose={() => setEditWishTarget(null)}
        />
      )}

      {alertTarget && (
        <PriceAlertDialog
          wish={alertTarget}
          alert={priceAlerts[getWishId(alertTarget)]}
          onSave={(targetAmount) => {
            savePriceAlert(getWishId(alertTarget), targetAmount);
            setAlertTarget(null);
          }}
          onRemove={() => {
            removePriceAlert(getWishId(alertTarget));
            setAlertTarget(null);
          }}
          onClose={() => setAlertTarget(null)}
        />
      )}

      {shareSheet && (
        <ShareSheet
          listTitle={shareSheet.title}
          shareUrl={shareSheet.url}
          copied={shareCopied}
          canUseNativeShare={typeof navigator !== "undefined" && Boolean(navigator.share)}
          onCopy={() => void handleCopyShareLink()}
          onNativeShare={() => void handleNativeShare()}
          onClose={() => {
            setShareSheet(null);
            setShareCopied(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Mostra o que o preenchimento automático não conseguiu, com a consequência de
 * cada ausência e o campo para resolver na hora.
 *
 * Pede só o que faltou, em vez de jogar o formulário inteiro na pessoa.
 */
/**
 * Dialog para completar um desejo já salvo, pedindo só o que falta.
 *
 * É o outro lado de "salvar incompleto": a pessoa adiciona com pressa e resolve
 * depois, em vez de ser travada no momento em que colou o link.
 */
function CompleteWishDialog({
  wish,
  saving,
  onSave,
  onClose,
}: {
  wish: LocalWish | DbWish;
  saving: boolean;
  onSave: (values: { imageUrl: string; priceText: string }) => void;
  onClose: () => void;
}) {
  const [imageUrl, setImageUrl] = useState(getWishImageUrlRaw(wish));
  const [priceText, setPriceText] = useState("");
  // Calculado na abertura, de propósito: se recalculasse a cada tecla, o campo
  // desapareceria e o botão de salvar se desabilitaria no meio da digitação.
  const [missing] = useState(() =>
    getMissingWishFields({
      imageUrl: getWishImageUrlRaw(wish),
      priceInCents: toCentsOrNull(getWishAmount(wish)),
    }),
  );

  const hasSomethingToSave =
    (missing.includes("image") && imageUrl.trim().length > 0) ||
    (missing.includes("price") && parsePriceInputToCents(priceText) != null);

  return (
    <div className="reserve-dialog-backdrop" onClick={saving ? undefined : onClose}>
      <div
        className="reserve-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Completar ${getWishTitle(wish)}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reserve-dialog-header">
          <div>
            <p className="label">Completar desejo</p>
            <h2>{getWishTitle(wish)}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar" disabled={saving}>
            <X size={20} />
          </button>
        </div>

        <form
          className="reserve-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({ imageUrl, priceText });
          }}
        >
          {missing.includes("image") && (
            <Field
              label="Link da imagem"
              placeholder="https://..."
              value={imageUrl}
              onChange={setImageUrl}
            />
          )}
          {missing.includes("price") && (
            <Field label="Preço" placeholder="189,90" value={priceText} onChange={setPriceText} />
          )}
          {missing.length === 0 && <p className="reserve-dialog-intro">Este desejo já está completo.</p>}

          <div className="field-row">
            <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button className="primary-button full" type="submit" disabled={saving || !hasSomethingToSave}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditWishDialog({
  wish,
  saving,
  onSave,
  onClose,
}: {
  wish: LocalWish | DbWish;
  saving: boolean;
  onSave: (values: { title: string; note: string; productUrl: string; imageUrl: string; priceText: string; priority: Priority }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(getWishTitle(wish));
  const [note, setNote] = useState(isLocalWish(wish) ? wish.status ?? "" : wish.description ?? "");
  const [productUrl, setProductUrl] = useState(getWishEditableUrl(wish));
  const [imageUrl, setImageUrl] = useState(getWishImageUrlRaw(wish));
  const amount = getWishAmount(wish);
  const [priceText, setPriceText] = useState(amount == null ? "" : formatCurrency(amount, getWishCurrency(wish)));
  const [priority, setPriority] = useState<Priority>(getWishPriorityLabel(wish) ?? "Baixa");

  return (
    <div className="reserve-dialog-backdrop" onClick={saving ? undefined : onClose}>
      <div
        className="reserve-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Editar ${getWishTitle(wish)}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reserve-dialog-header">
          <div>
            <p className="label">Editar desejo</p>
            <h2>{getWishTitle(wish)}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar" disabled={saving}>
            <X size={20} />
          </button>
        </div>

        <form
          className="reserve-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({ title, note, productUrl, imageUrl, priceText, priority });
          }}
        >
          <Field label="Nome" placeholder="Nome do produto" value={title} onChange={setTitle} />
          <Field label="Observação" placeholder="Tamanho, cor ou qualquer detalhe" textarea value={note} onChange={setNote} />
          <Field label="Link do produto" placeholder="https://..." value={productUrl} onChange={setProductUrl} />
          <Field label="Link da imagem" placeholder="https://..." value={imageUrl} onChange={setImageUrl} />
          <Field label="Preço" placeholder="189,90" value={priceText} onChange={setPriceText} />
          <div className="priority-selector">
            {(["Alta", "Media", "Baixa"] as Priority[]).map((option) => (
              <button
                key={option}
                className={priority === option ? "active" : ""}
                type="button"
                onClick={() => setPriority(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="field-row">
            <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button className="primary-button full" type="submit" disabled={saving || !title.trim()}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WishCompletionChecklist({
  title,
  imageUrl,
  priceText,
  onChangeImage,
  onChangePrice,
}: {
  title: string;
  imageUrl: string;
  priceText: string;
  onChangeImage: (value: string) => void;
  onChangePrice: (value: string) => void;
}) {
  const missing = getMissingWishFields({
    imageUrl,
    priceInCents: parsePriceInputToCents(priceText),
  });

  if (missing.length === 0) return null;

  return (
    <section className="completion-checklist" aria-label="Dados que faltam neste desejo">
      <div className="completion-checklist-head">
        <p className="label">Falta pouco</p>
        <p>Preenchemos o que o link entregou. Complete o resto para a lista funcionar melhor.</p>
      </div>

      {/* Só marca como pronto o que realmente está preenchido. */}
      {title.trim() ? (
        <div className="completion-row is-done">
          <Check size={16} aria-hidden="true" />
          <div>
            <strong>Nome</strong>
            <small>{title.trim()}</small>
          </div>
        </div>
      ) : (
        <div className="completion-row">
          <PencilLine size={16} aria-hidden="true" />
          <div>
            <strong>Nome</strong>
            <small>Sem nome não é possível salvar o desejo.</small>
          </div>
        </div>
      )}

      {missing.map((field) => {
        const copy = getMissingWishFieldCopy(field);
        return (
          <div className="completion-row" key={field}>
            <PencilLine size={16} aria-hidden="true" />
            <div>
              <strong>{copy.label}</strong>
              <small>{copy.consequence}</small>
              <Field
                label={copy.label}
                placeholder={copy.placeholder}
                value={field === "image" ? imageUrl : priceText}
                onChange={field === "image" ? onChangeImage : onChangePrice}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}

function ConfirmDeleteListDialog({
  listTitle,
  wishCount,
  reservedCount,
  deleting,
  onConfirm,
  onClose,
}: {
  listTitle: string;
  wishCount: number;
  reservedCount: number;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  // Exigir o nome digitado evita exclusão por engano em uma ação sem volta pela interface.
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText.trim().toLocaleLowerCase("pt-BR") === listTitle.trim().toLocaleLowerCase("pt-BR");

  return (
    <div className="reserve-dialog-backdrop" onClick={deleting ? undefined : onClose}>
      <div
        className="reserve-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Excluir a lista ${listTitle}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reserve-dialog-header">
          <div>
            <p className="label">Excluir lista</p>
            <h2>{listTitle}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar" disabled={deleting}>
            <X size={20} />
          </button>
        </div>

        <p className="reserve-dialog-intro">
          {wishCount > 0
            ? `${formatWishCount(wishCount)} saem da sua lista e o link compartilhado deixa de abrir.`
            : "A lista sai do seu Wishly e o link compartilhado deixa de abrir."}
          {reservedCount > 0
            ? ` ${reservedCount === 1 ? "Um convidado já reservou" : `${reservedCount} convidados já reservaram`} um presente aqui.`
            : ""}
        </p>

        <form
          className="reserve-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (canDelete) onConfirm();
          }}
        >
          <Field
            label={`Digite "${listTitle}" para confirmar`}
            placeholder={listTitle}
            value={confirmText}
            onChange={setConfirmText}
          />
          <div className="field-row">
            <button className="secondary-button" type="button" onClick={onClose} disabled={deleting}>
              Cancelar
            </button>
            <button className="secondary-button danger-button full" type="submit" disabled={!canDelete || deleting}>
              <Trash2 size={18} />
              {deleting ? "Excluindo..." : "Excluir lista"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PriceAlertDialog({
  wish,
  alert,
  onSave,
  onRemove,
  onClose,
}: {
  wish: LocalWish | DbWish;
  alert: PriceAlert | undefined;
  onSave: (targetAmount: number | null) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const currency = getWishCurrency(wish);
  const currentAmount = getWishAmount(wish);
  const [targetInput, setTargetInput] = useState(
    alert?.targetAmount != null ? String(alert.targetAmount).replace(".", ",") : "",
  );
  const [error, setError] = useState("");

  function submit() {
    const trimmed = targetInput.trim();
    if (!trimmed) {
      // Sem valor, o alerta segue ativo acompanhando qualquer queda.
      onSave(null);
      return;
    }

    const cents = parsePriceInputToCents(trimmed);
    if (cents == null || cents <= 0) {
      setError("Informe um preço-alvo válido, como 179,90.");
      return;
    }

    onSave(cents / 100);
  }

  return (
    <div className="reserve-dialog-backdrop" onClick={onClose}>
      <div
        className="reserve-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Alerta de preço para ${getWishTitle(wish)}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reserve-dialog-header">
          <div>
            <p className="label">Alerta de preço</p>
            <h2>{getWishTitle(wish)}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <p className="reserve-dialog-intro">
          {currentAmount != null
            ? `Hoje está ${formatCurrency(currentAmount, currency)}. Avisamos quando chegar ao seu alvo.`
            : "Esse item ainda não tem preço para comparar. O radar avisa quando houver."}
        </p>

        {error && (
          <div className="auth-feedback error" role="alert">
            {error}
          </div>
        )}

        <form
          className="reserve-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field
            label="Preço-alvo (opcional)"
            placeholder="179,90"
            value={targetInput}
            onChange={(value) => {
              setTargetInput(value);
              setError("");
            }}
          />
          <div className="field-row">
            {alert ? (
              <button className="secondary-button" type="button" onClick={onRemove}>
                Desativar radar
              </button>
            ) : (
              <button className="secondary-button" type="button" onClick={onClose}>
                Cancelar
              </button>
            )}
            <button className="primary-button full" type="submit">
              {alert ? "Salvar alerta" : "Ativar radar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ShareSheet({
  listTitle,
  shareUrl,
  copied,
  canUseNativeShare,
  onCopy,
  onNativeShare,
  onClose,
}: {
  listTitle: string;
  shareUrl: string;
  copied: boolean;
  canUseNativeShare: boolean;
  onCopy: () => void;
  onNativeShare: () => void;
  onClose: () => void;
}) {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Veja a lista ${listTitle} no Wishly: ${shareUrl}`)}`;

  return (
    <div className="reserve-dialog-backdrop" onClick={onClose}>
      <div
        className="reserve-dialog share-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Compartilhar lista"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reserve-dialog-header">
          <div>
            <p className="label">Compartilhar lista</p>
            <h2>{listTitle}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <p className="reserve-dialog-intro">
          Quem recebe o link vê os desejos e reserva um presente sem criar conta.
        </p>

        <div className="share-sheet-actions">
          <a className="primary-button full share-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">
            <Share2 size={18} />
            Enviar no WhatsApp
          </a>
          <button className="secondary-button full" type="button" onClick={onCopy}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Link copiado" : "Copiar link"}
          </button>
          {canUseNativeShare && (
            <button className="text-button" type="button" onClick={onNativeShare}>
              Mais opções de compartilhamento
            </button>
          )}
        </div>

        <p className="share-sheet-url">{shareUrl}</p>
      </div>
    </div>
  );
}

function MarketingHomePage({
  authForm,
  authMessage,
  authError,
  authSubmitState,
  authPanelMode,
  marketingMenuOpen,
  onCreateList,
  onLogin,
  onOpenListDemo,
  onResetAuthFlow,
  onSetAuthField,
  onSubmitAuth,
  onForgotPassword,
  onToggleMenu,
  syncing,
  templates,
  onUseTemplate,
}: {
  authForm: AuthFormState;
  authMessage: string;
  authError: string;
  authSubmitState: AuthSubmitState;
  authPanelMode: AuthPanelMode;
  marketingMenuOpen: boolean;
  onCreateList: () => void;
  onLogin: () => void;
  onOpenListDemo: () => void;
  onResetAuthFlow: () => void;
  onSetAuthField: <K extends keyof AuthFormState>(field: K, value: AuthFormState[K]) => void;
  onSubmitAuth: () => void;
  onForgotPassword: () => void;
  onToggleMenu: () => void;
  syncing: boolean;
  templates: ListTemplate[];
  onUseTemplate: (template: ListTemplate) => void;
}) {
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const authBusy = syncing || authSubmitState === "submitting";
  const marketingImages = {
    heroCover:
      "https://media.architecturaldigest.com/photos/6879507ebb0032785eb73ee6/4%3A3/w_1600%2Cc_limit/41.%2520Hamptons%2520Modern%2520by%2520Chango%2520%26%2520Co.%2520-%2520Nursery%2520with%2520Glider%2520Detail.jpg",
    cribMobile:
      "https://www.mumzworld.com/media/catalog/product/g/f/gf-6981b-goodway-baby-bed-bell-hanging-toy-w-rattles-beige-1654780543.jpg",
    playGym:
      "https://tinystepskids.co.uk/cdn/shop/products/Jabadabadoo_wooden-Baby-Gym-grey_1800x1800.jpg?v=1620641436",
    lamp:
      "https://www.modishstore.com/cdn/shop/products/468693_1.jpg?v=1755510615&width=990",
  };

  const heroItems = [
    { title: "Móbile para berço", meta: "Novo desejo adicionado", image: marketingImages.cribMobile, badge: "novo" },
    { title: "Play gym de madeira", meta: "Reservado por Marina", image: marketingImages.playGym, badge: "reservado" },
    { title: "Abajur para o quarto", meta: "Preço caiu para R$ 189", image: marketingImages.lamp, badge: "queda de preço" },
  ];

  useEffect(() => {
    if (!marketingMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onToggleMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [marketingMenuOpen, onToggleMenu]);

  const openAuthPanel = () => {
    if (marketingMenuOpen) {
      onToggleMenu();
    }
    setAuthPanelOpen(true);
    window.requestAnimationFrame(() => {
      document.getElementById("login-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const openCreateAccountPanel = () => {
    onCreateList();
    openAuthPanel();
  };

  const openLoginPanel = () => {
    onLogin();
    openAuthPanel();
  };

  const scrollToSection = (sectionId: string) => {
    if (marketingMenuOpen) {
      onToggleMenu();
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCreateList = () => {
    if (marketingMenuOpen) {
      onToggleMenu();
    }
    openCreateAccountPanel();
  };

  const handleOpenListDemo = () => {
    if (marketingMenuOpen) {
      onToggleMenu();
    }
    onOpenListDemo();
  };

  return (
    <div className="marketing-page">
      <header className="marketing-header">
        <div className="marketing-header-inner">
          <button className="brand-lockup" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Wishly">
            <img className="wordmark" src={images.logo} alt="Wishly" />
          </button>

          <div className="marketing-nav">
            <button type="button" onClick={() => scrollToSection("como-funciona")}>
              Como funciona
            </button>
            <button type="button" onClick={() => scrollToSection("radar-precos")}>
              Acompanhar preços
            </button>
            <div className="marketing-actions">
              <button className="secondary-button" type="button" onClick={openLoginPanel}>
                Entrar
              </button>
              <button className="primary-button" type="button" onClick={handleCreateList}>
                Criar lista
              </button>
            </div>
          </div>

          <button className="icon-button marketing-menu" type="button" onClick={onToggleMenu} aria-label="Abrir menu">
            {marketingMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <div
        className={`marketing-menu-overlay ${marketingMenuOpen ? "open" : ""}`}
        onClick={marketingMenuOpen ? onToggleMenu : undefined}
        aria-hidden={marketingMenuOpen ? "false" : "true"}
      />

      <aside
        className={`marketing-drawer ${marketingMenuOpen ? "open" : ""}`}
        aria-hidden={!marketingMenuOpen}
        aria-label="Menu do Wishly"
        aria-modal="true"
        role="dialog"
      >
        <div className="marketing-drawer-header">
          <img className="wordmark" src={images.logo} alt="Wishly" />
          <button className="icon-button marketing-drawer-close" type="button" onClick={onToggleMenu} aria-label="Fechar menu">
            <X size={22} />
          </button>
        </div>

        <nav className="marketing-drawer-nav" aria-label="Navegação principal">
          <button type="button" onClick={() => scrollToSection("como-funciona")}>
            Como funciona
          </button>
          <button type="button" onClick={() => scrollToSection("radar-precos")}>
            Acompanhar preços
          </button>
        </nav>

        <div className="marketing-drawer-divider" aria-hidden="true" />

        <button className="text-button marketing-drawer-login" type="button" onClick={openLoginPanel}>
          Entrar
        </button>

        <div className="marketing-drawer-footer">
          <button className="primary-button full" type="button" onClick={handleCreateList}>
            Criar lista
          </button>
        </div>
      </aside>

      {authPanelOpen ? (
        <div className="marketing-login-band" id="login-panel">
        <div className="marketing-login-card">
            {authError && <div className="auth-feedback error" role="alert" aria-live="polite">{authError}</div>}
            {authMessage ? (
              <>
                <div className="marketing-login-copy">
                  <p className="label">{authPanelMode === "create" ? "Criar conta" : "Entrar"}</p>
                  <h2>Confira seu e-mail</h2>
                  <p>{authMessage}</p>
                </div>
                <div className="marketing-login-actions">
                  <button className="secondary-button" type="button" onClick={onResetAuthFlow}>
                    Voltar para o formulário
                  </button>
                  <button
                    className="text-button auth-switch-button"
                    type="button"
                    onClick={authPanelMode === "create" ? openLoginPanel : openCreateAccountPanel}
                  >
                    {authPanelMode === "create" ? "Já tenho conta" : "Criar conta"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="marketing-login-copy">
                  <p className="label">{authPanelMode === "create" ? "Criar conta" : "Entrar"}</p>
                  <h2>{authPanelMode === "create" ? "Crie sua conta para montar sua lista" : "Entre para continuar sua lista"}</h2>
                  <p>
                    {authPanelMode === "create"
                      ? "Seu cadastro já abre o fluxo para criar a primeira lista."
                      : "Use seu e-mail e senha para acessar suas listas e continuar de onde parou."}
                  </p>
                </div>
                <form
                  className="marketing-login-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onSubmitAuth();
                  }}
                >
                  {authPanelMode === "create" && (
                    <Field
                      label="Nome"
                      placeholder="Gabriel Fachini"
                      value={authForm.fullName}
                      onChange={(value) => onSetAuthField("fullName", value)}
                      autoComplete="name"
                    />
                  )}
                  <Field
                    label="E-mail"
                    placeholder="voce@exemplo.com"
                    value={authForm.email}
                    onChange={(value) => onSetAuthField("email", value)}
                    autoComplete="email"
                  />
                  <Field
                    label="Senha"
                    placeholder={authPanelMode === "create" ? "Crie uma senha" : "Sua senha"}
                    value={authForm.password}
                    onChange={(value) => onSetAuthField("password", value)}
                    inputType="password"
                    autoComplete={authPanelMode === "create" ? "new-password" : "current-password"}
                  />
                  {authPanelMode === "create" && (
                    <Field
                      label="Confirmar senha"
                      placeholder="Repita sua senha"
                      value={authForm.confirmPassword}
                      onChange={(value) => onSetAuthField("confirmPassword", value)}
                      inputType="password"
                      autoComplete="new-password"
                    />
                  )}
                  <button
                    className="primary-button full"
                    type="submit"
                    disabled={!authForm.email.trim() || !authForm.password || authBusy}
                  >
                    {authBusy ? "Entrando..." : authPanelMode === "create" ? "Criar conta" : "Entrar"}
                  </button>
                  {authPanelMode === "login" && (
                    <button className="text-button auth-switch-button" type="button" onClick={onForgotPassword} disabled={authBusy}>
                      Esqueci minha senha
                    </button>
                  )}
                  <button
                    className="text-button auth-switch-button"
                    type="button"
                    onClick={authPanelMode === "create" ? openLoginPanel : openCreateAccountPanel}
                    disabled={authBusy}
                  >
                    {authPanelMode === "create" ? "Já tenho conta" : "Criar conta"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}

      <main className="marketing-main">
        <section className="marketing-hero">
          <div className="hero-copy-block">
            <h1>Guarde seus desejos e acompanhe os preços.</h1>
            <p className="hero-support">
              Salve produtos de qualquer loja, defina o preço que você quer pagar e compartilhe a lista quando for
              presente — quem recebe reserva sem criar conta.
            </p>
            <div className="hero-cta-row">
              <button className="primary-button" type="button" onClick={handleCreateList}>
                Criar minha lista
              </button>
              <button className="secondary-button" type="button" onClick={handleOpenListDemo}>
                Ver como funciona
              </button>
            </div>
            <span className="hero-proof">Grátis para começar.</span>
          </div>

          <div className="hero-stage">
            <article className="marketing-hero-card">
              <div className="marketing-hero-cover">
                <img src={marketingImages.heroCover} alt="Quarto de bebê com luz natural e objetos do enxoval" />
                <div className="marketing-hero-cover-copy">
                  <span>Lista compartilhada</span>
                  <button className="icon-button small" type="button" aria-label="Compartilhar">
                    <Share2 size={16} />
                  </button>
                  <h2>Chá de bebê da Cil e do Gabriel</h2>
                  <p>4 desejos adicionados · 1 com queda de preço · 1 reservado</p>
                </div>
              </div>
              <div className="marketing-hero-items">
                {heroItems.map((item) => (
                  <article className="marketing-item-card" key={item.title}>
                    <img src={item.image} alt="" />
                    <div className="marketing-item-copy">
                      <strong>{item.title}</strong>
                      <span>{item.meta}</span>
                    </div>
                    <small>{item.badge}</small>
                  </article>
                ))}
                <div className="marketing-hero-footer">
                  <span>Uma lista clara para quem cria e para quem vai presentear.</span>
                  <button className="secondary-button" type="button" onClick={handleOpenListDemo}>
                    Ver lista
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        {templates.length > 0 && (
          <section className="marketing-section" id="modelos">
            <div className="section-intro">
              <h2>Comece com uma lista pronta</h2>
              <p>Modelos com produtos já escolhidos. Você usa como base e ajusta do seu jeito.</p>
            </div>
            <div className="template-grid">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} busy={false} onUse={() => onUseTemplate(template)} />
              ))}
            </div>
          </section>
        )}

        <section className="marketing-section marketing-steps-section" id="como-funciona">
          <div className="section-intro">
            <h2>Como funciona</h2>
            <p>Três passos para criar e compartilhar sua lista.</p>
          </div>
          <div className="marketing-steps-grid">
            {[
              { step: "1", title: "Crie sua lista", text: "Escolha um modelo ou comece do zero.", detail: "Modelo ou lista vazia" },
              { step: "2", title: "Adicione seus desejos", text: "Cole o link de qualquer produto.", detail: "Nome, imagem e preço" },
              { step: "3", title: "Compartilhe", text: "Envie por link ou WhatsApp.", detail: "Sem conta para convidados" },
            ].map((item) => (
              <article className="marketing-step-card" key={item.step}>
                <span>{item.step}</span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="marketing-section marketing-price-section" id="radar-precos">
          <div className="marketing-price-copy">
            <div>
              <h2>O preço mudou? O Wishly avisa.</h2>
              <p>Defina o preço que faz sentido para você e acompanhe os produtos da sua lista até chegar lá.</p>
              <span className="price-inline-copy">Preço-alvo por item · Histórico de preços · Produtos de várias lojas</span>
            </div>
          </div>
          <div className="marketing-price-card">
            <div className="marketing-price-head">
              <img src={marketingImages.lamp} alt="Abajur branco em fundo neutro" />
              <div>
                <strong>Abajur para leitura</strong>
                <span>Mercado Livre · alerta ativo</span>
              </div>
            </div>
            <div className="marketing-price-values">
              <article>
                <span>Preço atual</span>
                <strong>R$ 189</strong>
              </article>
              <article>
                <span>Preço anterior</span>
                <strong>R$ 229</strong>
              </article>
              <article className="drop">
                <span>Queda</span>
                <strong>-17%</strong>
              </article>
            </div>
            <div className="marketing-price-graph" aria-hidden="true">
              <div className="marketing-price-scale">
                <span>R$ 229</span>
                <span>R$ 209</span>
                <span>R$ 189</span>
              </div>
              <div className="marketing-price-chart">
                <div className="marketing-price-grid">
                  <span />
                  <span />
                  <span />
                </div>
                <svg className="marketing-price-svg" viewBox="0 0 260 88" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="priceArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(143, 77, 57, 0.22)" />
                      <stop offset="100%" stopColor="rgba(143, 77, 57, 0.02)" />
                    </linearGradient>
                  </defs>
                  <path
                    className="marketing-price-area"
                    d="M 0 12 C 20 18, 36 26, 52 34 S 92 46, 104 52 S 146 60, 156 66 S 198 70, 208 74 S 238 76, 260 78 L 260 88 L 0 88 Z"
                  />
                  <path
                    className="marketing-price-path"
                    d="M 0 12 C 20 18, 36 26, 52 34 S 92 46, 104 52 S 146 60, 156 66 S 198 70, 208 74 S 238 76, 260 78"
                  />
                  {[
                    { cx: 0, cy: 12 },
                    { cx: 52, cy: 34 },
                    { cx: 104, cy: 52 },
                    { cx: 156, cy: 66 },
                    { cx: 208, cy: 74 },
                    { cx: 260, cy: 78 },
                  ].map((point, index) => (
                    <circle className="marketing-price-point" cx={point.cx} cy={point.cy} r="4.5" key={index} />
                  ))}
                </svg>
                <div className="marketing-price-labels">
                  <span>Seg</span>
                  <span>Ter</span>
                  <span>Qua</span>
                  <span>Qui</span>
                  <span>Hoje</span>
                </div>
              </div>
            </div>
            <p className="price-note">
              <TrendingDown size={16} />
              Avise quando baixar para R$ 179.
            </p>
          </div>
        </section>

        <section className="marketing-section marketing-share-section">
          <div className="section-intro">
            <h2>Compartilhar a lista deve ser tão simples quanto criar.</h2>
            <p>Quem recebe sua lista pode ver os desejos e escolher um presente sem criar conta.</p>
          </div>
          <div className="marketing-share-layout">
            <div className="marketing-phone-preview">
              <div className="marketing-phone-header">
                <strong>Lista da Sofia</strong>
                <span>Visualização para quem vai presentear</span>
              </div>
              <article className="marketing-item-card compact">
                <img src={marketingImages.playGym} alt="" />
                <div className="marketing-item-copy">
                  <strong>Play gym de madeira</strong>
                  <span>Faixa ideal · R$ 249</span>
                </div>
                <small>Disponível</small>
              </article>
              <article className="marketing-item-card compact">
                <img src={marketingImages.lamp} alt="" />
                <div className="marketing-item-copy">
                  <strong>Abajur para leitura</strong>
                  <span>Reservado por Mariana</span>
                </div>
                <small>Reservado</small>
              </article>
            </div>
            <div className="marketing-share-actions">
              <div className="marketing-share-action">
                <span>
                  <Share2 size={18} />
                </span>
                <div>
                  <strong>WhatsApp</strong>
                  <p>Compartilhe a lista direto com amigos e família.</p>
                </div>
              </div>
              <div className="marketing-share-action">
                <span>
                  <Link2 size={18} />
                </span>
                <div>
                  <strong>Copiar link</strong>
                  <p>Um único link com capa, título e desejos.</p>
                </div>
              </div>
              <div className="marketing-share-action">
                <span>
                  <Heart size={18} />
                </span>
                <div>
                  <strong>Reserva sem conta</strong>
                  <p>Quem escolhe um presente marca a reserva. Nenhum presente repetido.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="marketing-section marketing-final-section">
          <div className="marketing-final-copy">
            <h2>Sua próxima lista começa aqui.</h2>
            <p>Organize seus desejos e compartilhe quando quiser.</p>
            <div className="hero-cta-row centered">
              <button className="primary-button" type="button" onClick={openCreateAccountPanel}>
                Criar minha lista grátis
              </button>
              <button className="text-button" type="button" onClick={openLoginPanel}>
                Já tenho uma conta
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="marketing-footer">
        <img className="wordmark" src={images.logo} alt="Wishly" />
        <div className="footer-links">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Produto</button>
          <button type="button" onClick={() => scrollToSection("como-funciona")}>Como funciona</button>
          <span>Privacidade</span>
          <span>Termos</span>
          <button type="button" onClick={openLoginPanel}>Ajuda</button>
          <span>Instagram</span>
        </div>
        <p>Alguns links podem gerar comissão para o Wishly, sem mudar o valor pago por você.</p>
      </footer>
    </div>
  );
}

function HomeScreen({
  go,
  pendingCount,
  session,
  authForm,
  setAuthField,
  onCreateList,
  onLogin,
  authPanelMode,
  onSubmitAuth,
  onForgotPassword,
  syncing,
  lists,
  onOpenList,
  notices,
  templates,
  applyingTemplateId,
  onUseTemplate,
}: {
  go: (view: View) => void;
  pendingCount: number;
  session: Session | null;
  authForm: AuthFormState;
  setAuthField: <K extends keyof AuthFormState>(field: K, value: AuthFormState[K]) => void;
  onCreateList: () => void;
  onLogin: () => void;
  authPanelMode: AuthPanelMode;
  onSubmitAuth: () => void;
  onForgotPassword: () => void;
  syncing: boolean;
  lists: HomeListSummary[];
  onOpenList: (listId: string) => void;
  notices: string[];
  templates: ListTemplate[];
  applyingTemplateId: string | null;
  onUseTemplate: (template: ListTemplate) => void;
}) {
  return (
    <>
      <div className="dashboard-overview">
        {supabaseEnabled && !session && (
          <section className="inset-section dashboard-auth">
            <div className="auth-card">
              <div className="auth-mode-row" role="tablist" aria-label="Fluxo de autenticação">
                <button
                  className={authPanelMode === "create" ? "active" : ""}
                  type="button"
                  role="tab"
                  aria-selected={authPanelMode === "create"}
                  onClick={onCreateList}
                >
                  Criar lista
                </button>
                <button
                  className={authPanelMode === "login" ? "active" : ""}
                  type="button"
                  role="tab"
                  aria-selected={authPanelMode === "login"}
                  onClick={onLogin}
                >
                  Entrar
                </button>
              </div>
              <p className="label">{authPanelMode === "create" ? "Novo cadastro" : "Acesse sua conta"}</p>
              <h2>{authPanelMode === "create" ? "Crie sua conta e comece a lista" : "Entre no Wishly"}</h2>
              <p>
                {authPanelMode === "create"
                  ? "Cadastre seus dados para criar a primeira lista."
                  : "Use seu e-mail e senha para voltar para suas listas."}
              </p>
              <form
                className="auth-inline"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSubmitAuth();
                }}
              >
                {authPanelMode === "create" && (
                  <Field
                    label="Nome"
                    placeholder="Gabriel Fachini"
                    value={authForm.fullName}
                    onChange={(value) => setAuthField("fullName", value)}
                    autoComplete="name"
                  />
                )}
                <Field
                  label="Email"
                  placeholder="voce@exemplo.com"
                  value={authForm.email}
                  onChange={(value) => setAuthField("email", value)}
                  autoComplete="email"
                />
                <Field
                  label="Senha"
                  placeholder={authPanelMode === "create" ? "Crie uma senha" : "Sua senha"}
                  value={authForm.password}
                  onChange={(value) => setAuthField("password", value)}
                  inputType="password"
                  autoComplete={authPanelMode === "create" ? "new-password" : "current-password"}
                />
                {authPanelMode === "create" && (
                  <Field
                    label="Confirmar senha"
                    placeholder="Repita sua senha"
                    value={authForm.confirmPassword}
                    onChange={(value) => setAuthField("confirmPassword", value)}
                    inputType="password"
                    autoComplete="new-password"
                  />
                )}
                <button
                  className="primary-button full"
                  type="submit"
                  disabled={!authForm.email.trim() || !authForm.password || syncing}
                >
                  {syncing ? "Enviando..." : authPanelMode === "create" ? "Criar conta" : "Entrar"}
                </button>
                {authPanelMode === "login" && (
                  <button className="text-button auth-switch-button" type="button" onClick={onForgotPassword} disabled={syncing}>
                    Esqueci minha senha
                  </button>
                )}
                <button className="text-button auth-switch-button" type="button" onClick={authPanelMode === "create" ? onLogin : onCreateList}>
                  {authPanelMode === "create" ? "Já tenho conta" : "Criar conta"}
                </button>
              </form>
            </div>
          </section>
        )}

        {notices.length > 0 && (
          <section className="inset-section dashboard-notices">
            <p className="label">Novidades nas suas listas</p>
            <div className="notice-card">
              {notices.map((notice) => (
                <Notice icon={<ArrowDown size={18} />} text={notice} key={notice} />
              ))}
              {pendingCount > 0 && (
                <Notice
                  icon={<ShieldCheck size={18} />}
                  text={`${pendingCount} link${pendingCount > 1 ? "s" : ""} aguardando tratamento de afiliado.`}
                />
              )}
            </div>
          </section>
        )}
      </div>

      {lists.length > 0 ? (
        <Shelf title="Suas listas" variant="lists">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              image={list.coverUrl}
              title={list.title}
              meta={list.meta}
              badge={list.isSelected ? "ATUAL" : "LISTA"}
              onClick={() => onOpenList(list.id)}
            />
          ))}
        </Shelf>
      ) : (
        <section className="shelf">
          <div className="section-heading">
            <h2>Suas listas</h2>
          </div>
          <div className="empty-state">
            <Gift size={26} />
            <h3>Você ainda não tem listas.</h3>
            <p>Crie a primeira para guardar desejos, acompanhar preços e compartilhar quando for presente.</p>
            <button className="primary-button" type="button" onClick={() => go("create_list")}>
              <Plus size={18} />
              Criar minha primeira lista
            </button>
          </div>
        </section>
      )}

      {/* Modelos reais, curados pelo time, com produtos dentro. Sem modelo
          publicado a seção simplesmente não aparece. */}
      {templates.length > 0 && (
        <section className="idea-band">
          <div className="section-heading section-heading-stacked">
            <h2>Ideias para começar</h2>
            <p>Listas prontas com produtos escolhidos. Use como base e ajuste do seu jeito.</p>
          </div>
          <div className="template-grid">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                busy={applyingTemplateId === template.id}
                onUse={() => onUseTemplate(template)}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function TemplateCard({
  template,
  busy,
  onUse,
}: {
  template: ListTemplate;
  busy: boolean;
  onUse: () => void;
}) {
  const itemCount = template.items.length;
  const total = template.items.reduce((sum, item) => sum + (item.estimated_price ?? 0), 0);

  return (
    <article className="template-card">
      <img src={resolveListCover(template.cover_image_url, template.title)} alt="" />
      <div className="template-card-copy">
        <div>
          <h3>{template.title}</h3>
          {template.description && <p>{template.description}</p>}
          <p className="template-card-meta">
            {itemCount > 0 ? formatWishCount(itemCount) : "Lista vazia"}
            {total > 0 ? ` · a partir de ${formatCurrency(total, template.items[0]?.currency ?? "BRL")}` : ""}
          </p>
        </div>

        {itemCount > 0 && (
          <ul className="template-card-items">
            {template.items.slice(0, 3).map((item) => (
              <li key={item.id}>
                <span>{item.name}</span>
                {item.estimated_price != null && <small>{formatCurrency(item.estimated_price, item.currency)}</small>}
              </li>
            ))}
            {itemCount > 3 && <li className="template-card-more">+ {itemCount - 3} itens</li>}
          </ul>
        )}

        <button className="primary-button full" type="button" onClick={onUse} disabled={busy}>
          {busy ? "Criando lista..." : "Usar este modelo"}
        </button>
      </div>
    </article>
  );
}

function ResetPasswordScreen({
  passwordResetForm,
  onChangeField,
  onSubmit,
  syncing,
}: {
  passwordResetForm: PasswordResetFormState;
  onChangeField: <K extends keyof PasswordResetFormState>(field: K, value: PasswordResetFormState[K]) => void;
  onSubmit: () => void;
  syncing: boolean;
}) {
  return (
    <section className="profile-settings-layout reset-password-layout">
      <article className="profile-settings-card reset-password-card">
        <div>
          <p className="label">Recuperação de acesso</p>
          <h2>Crie uma nova senha</h2>
          <p>Use o link do e-mail para definir uma nova senha antes de voltar ao Wishly.</p>
        </div>

        <div className="profile-settings-fields">
          <Field
            label="Nova senha"
            placeholder="Digite a nova senha"
            value={passwordResetForm.newPassword}
            onChange={(value) => onChangeField("newPassword", value)}
            inputType="password"
            autoComplete="new-password"
          />
          <Field
            label="Confirmar nova senha"
            placeholder="Repita a nova senha"
            value={passwordResetForm.confirmNewPassword}
            onChange={(value) => onChangeField("confirmNewPassword", value)}
            inputType="password"
            autoComplete="new-password"
          />
        </div>

        <div className="field-row">
          <button
            className="primary-button full"
            type="button"
            onClick={onSubmit}
            disabled={!passwordResetForm.newPassword.trim() || !passwordResetForm.confirmNewPassword.trim() || syncing}
          >
            {syncing ? "Atualizando..." : "Atualizar senha"}
          </button>
        </div>
      </article>
    </section>
  );
}

function CreateListScreen({
  formState,
  onBack,
  onChange,
  onSelectCover,
  onSubmit,
  onRequestDelete,
  syncing,
  mode,
}: {
  formState: CreateListFormState;
  onBack: () => void;
  onChange: (title: string) => void;
  onSelectCover: (files: FileList | null) => void;
  onSubmit: () => void;
  onRequestDelete: () => void;
  syncing: boolean;
  mode: CreateListMode;
}) {
  const isEditing = mode === "edit";
  // Sem upload, mostramos desde já a capa gerada a partir do nome da lista.
  const coverPreviewSrc =
    formState.coverPreview || (formState.title.trim() ? buildDefaultListCover(formState.title) : null);

  return (
    <section className="desktop-flow-layout">
      <form
        className="form-stack desktop-flow-main"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="upload-card">
          <Heart size={24} />
          <h2>{isEditing ? "Edite o nome da lista" : "Crie sua primeira lista"}</h2>
          <p>
            {isEditing
              ? "Ajuste o nome da lista sem perder os desejos já salvos."
              : "Escolha um nome para começar. Depois você adiciona os desejos e compartilha quando quiser."}
          </p>
        </div>

        <Field
          label="Nome da lista"
          placeholder="Chá de bebê da Ana"
          value={formState.title}
          onChange={onChange}
          maxLength={80}
        />

        <label className={`cover-upload ${coverPreviewSrc ? "has-preview" : ""}`}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => onSelectCover(event.target.files)}
            disabled={syncing}
          />
          {coverPreviewSrc ? (
            <>
              <img src={coverPreviewSrc} alt="Prévia da capa da lista" />
              <span className="cover-upload-overlay">
                <Upload size={20} />
                {formState.coverPreview ? "Trocar imagem" : "Enviar sua imagem"}
              </span>
            </>
          ) : (
            <span className="cover-upload-empty">
              <Upload size={24} />
              <strong>Enviar imagem de capa</strong>
              <small>Opcional · JPG, PNG ou WebP · até 6 MB</small>
            </span>
          )}
        </label>
        {!formState.coverPreview && coverPreviewSrc && (
          <p className="cover-upload-hint">Sem imagem, a lista usa esta capa. Você pode trocar quando quiser.</p>
        )}

        <div className="field-row">
          <button className="secondary-button" type="button" onClick={onBack}>
            <ArrowLeft size={18} />
            Voltar
          </button>
          <button
            className="primary-button full"
            type="submit"
            disabled={!formState.title.trim() || syncing}
          >
            {syncing
              ? isEditing
                ? "Salvando..."
                : "Criando..."
              : isEditing
                ? "Salvar alterações"
                : "Criar lista e adicionar itens"}
          </button>
        </div>

        {isEditing && (
          <div className="danger-card list-danger-card">
            <div>
              <p className="label">Zona de perigo</p>
              <h2>Excluir esta lista</h2>
              <p>A lista sai do seu Wishly e o link compartilhado deixa de abrir para os convidados.</p>
            </div>
            <button className="secondary-button danger-button" type="button" onClick={onRequestDelete} disabled={syncing}>
              <Trash2 size={18} />
              Excluir lista
            </button>
          </div>
        )}
      </form>

      <aside className="desktop-flow-aside">
        <div className="desktop-flow-card">
          <p className="label">Primeiro passo</p>
          <h2>{isEditing ? "O nome aparece em todo o fluxo" : "Sua lista nasce pronta para receber desejos"}</h2>
          <p>
            {isEditing
              ? "Ao salvar, o novo nome atualiza o topo, o resumo e o compartilhamento."
              : "Depois de criar a lista, você pode colar links, ajustar prioridades e compartilhar quando tudo estiver organizado."}
          </p>
        </div>
        <div className="desktop-flow-points">
          <article>
            <strong>1. Crie a lista</strong>
            <p>Dê um nome ao momento que você quer organizar.</p>
          </article>
          <article>
            <strong>2. Adicione desejos</strong>
            <p>Salve produtos de qualquer loja no mesmo lugar.</p>
          </article>
          <article>
            <strong>3. Compartilhe</strong>
            <p>Envie a lista quando estiver pronta para circular.</p>
          </article>
        </div>
      </aside>
    </section>
  );
}

function ListScreen({
  go,
  onAddWish,
  priceAlerts,
  onEditAlert,
  onCompleteWish,
  wishes,
  wishlistTitle,
  wishlistCoverUrl,
  wishlists,
  selectedWishlistId,
  isRemoteMode,
  onSelectWishlist,
  onBuyWish,
  onEditWish,
  onMarkWishPurchased,
  onDeleteWish,
  onShare,
  sharing,
  onEditList,
  canEditList,
}: {
  go: (view: View) => void;
  onAddWish: () => void;
  priceAlerts: Record<string, PriceAlert>;
  onEditAlert: (wish: LocalWish | DbWish) => void;
  onCompleteWish: (wish: LocalWish | DbWish) => void;
  wishes: Array<LocalWish | DbWish>;
  wishlistTitle: string;
  wishlistCoverUrl: string;
  wishlists: DbWishlist[];
  selectedWishlistId: string | null;
  isRemoteMode: boolean;
  onSelectWishlist: (wishlistId: string) => void;
  onBuyWish: (wish: LocalWish | DbWish) => void;
  onEditWish: (wish: LocalWish | DbWish) => void;
  onMarkWishPurchased: (wish: LocalWish | DbWish) => void;
  onDeleteWish: (wish: LocalWish | DbWish) => void;
  onShare: () => void;
  sharing: boolean;
  onEditList: () => void;
  canEditList: boolean;
}) {
  return (
    <>
      <section className="hero-list">
        <img src={wishlistCoverUrl} alt={`Capa da lista ${wishlistTitle}`} />
        <div className="hero-gradient" />
        <div className="hero-copy">
          <p className="label light">Sua lista</p>
          <h2>{wishlistTitle}</h2>
          <p>{formatWishCount(wishes.length)} · compartilhe quando estiver pronta para circular.</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={onAddWish}>
              <Plus size={18} />
              Adicionar
            </button>
            <button className="secondary-button light" type="button" onClick={onShare} disabled={sharing}>
              <Share2 size={18} />
              {sharing ? "Preparando link..." : "Compartilhar"}
            </button>
            {canEditList && (
              <button className="text-button hero-edit-button" type="button" onClick={onEditList}>
                <PencilLine size={16} />
                Editar lista
              </button>
            )}
          </div>
        </div>
      </section>
      
      {/* Os desejos vêm antes do resumo: são o conteúdo que a pessoa abriu a lista para ver. */}
      <section className="wish-list-section">
        <div className="section-heading">
          <h2>Seus desejos</h2>
          {wishes.length > 0 && <span className="section-count">{formatWishCount(wishes.length)}</span>}
        </div>
        {wishes.length === 0 ? (
          <div className="wishlist-empty">
            <Gift size={28} />
            <div>
              <strong>Sua lista está pronta.</strong>
              <p>Adicione o primeiro item para começar a organizar seus desejos.</p>
            </div>
            <button className="primary-button" type="button" onClick={onAddWish}>
              <Plus size={18} />
              Adicionar primeiro item
            </button>
          </div>
        ) : (
          <div className="wish-list">
            {wishes.map((wish) => (
              <WishCard
                key={getWishId(wish)}
                wish={wish}
                alert={priceAlerts[getWishId(wish)]}
                onTrack={() => onEditAlert(wish)}
                onBuy={() => onBuyWish(wish)}
                onComplete={() => onCompleteWish(wish)}
                onEdit={() => onEditWish(wish)}
                onMarkPurchased={() => onMarkWishPurchased(wish)}
                onDelete={() => onDeleteWish(wish)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="inset-section compact list-overview">
        <div className="list-summary-stack">
          {isRemoteMode && wishlists.length > 1 && (
            <div className="wishlist-switcher" aria-label="Selecionar lista">
              {wishlists.map((wishlist) => (
                <button
                  key={wishlist.id}
                  className={wishlist.id === selectedWishlistId ? "active" : ""}
                  type="button"
                  onClick={() => onSelectWishlist(wishlist.id)}
                >
                  {wishlist.title}
                </button>
              ))}
            </div>
          )}
          <div className="list-summary-card">
            <div className="list-summary-head">
              <div>
                <p className="label">Resumo da lista</p>
                <h3>{wishlistTitle}</h3>
              </div>
              <span className="summary-badge">Atualizada agora</span>
            </div>
            <div className="stat-grid">
              <Stat value={String(wishes.length)} label="desejos" />
              <Stat value={String(wishes.filter((wish) => getWishDrop(wish)).length)} label="promoções" />
              <Stat value={String(wishes.filter((wish) => getWishStatus(wish) === "Reservado").length)} label="reservados" />
            </div>
          </div>
        </div>

        <div className="list-summary-card list-summary-card-accent">
          <p className="label">Lista pronta para compartilhar</p>
          <h3>Quem recebe vê o que importa, sem confusão.</h3>
          <p>Os desejos ficam organizados por prioridade, reservas e sinais de preço. A lista continua simples para quem envia e para quem compra.</p>
          <div className="list-summary-notes">
            <div>
              <strong>{wishes.filter((wish) => priceAlerts[getWishId(wish)]).length}</strong>
              <span>itens com radar ativo</span>
            </div>
            <div>
              <strong>{wishes.filter((wish) => getWishPriorityLabel(wish) === "Alta").length}</strong>
              <span>prioridades altas</span>
            </div>
          </div>
          <button className="secondary-button" type="button" onClick={onShare} disabled={sharing}>
              <Share2 size={18} />
              {sharing ? "Preparando link..." : "Compartilhar"}
            </button>
        </div>
      </section>

    </>
  );
}

function ProductImageManager({
  formState,
  setFormState,
  disabled,
}: {
  formState: AddWishFormState;
  setFormState: (state: AddWishFormState) => void;
  disabled: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [imageError, setImageError] = useState("");
  const [processing, setProcessing] = useState(false);

  function commitImages(images: ProductImageDraft[], removedImageUrls = formState.removedImageUrls) {
    const primary = getPrimaryProductImage(images);
    setFormState({
      ...formState,
      images,
      removedImageUrls,
      imageUrl: primary?.url ?? "",
      imageUrlsText: images.map((image) => image.url).join("\n"),
    });
  }

  function addImageUrl() {
    if (!isValidHttpUrl(imageUrlDraft.trim())) {
      setImageError("Informe uma URL de imagem válida.");
      return;
    }
    const images = addManualImageUrl(formState.images, imageUrlDraft);
    setImageError("");
    setImageUrlDraft("");
    commitImages(images);
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setProcessing(true);
    setImageError("");
    try {
      const additions = await Promise.all([...files].map(prepareUploadedProductImage));
      const images = [
        ...additions.map((image, index) => ({ ...image, isPrimary: index === 0 })),
        ...formState.images.map((image) => ({ ...image, isPrimary: false })),
      ];
      commitImages(images);
    } catch (error) {
      setImageError(getErrorMessage(error));
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(image: ProductImageDraft) {
    if (image.url.startsWith("blob:")) URL.revokeObjectURL(image.url);
    const images = removeProductImage(formState.images, image.id);
    const removedImageUrls = image.source === "user_upload"
      ? formState.removedImageUrls
      : [...new Set([...formState.removedImageUrls, image.url])];
    commitImages(images, removedImageUrls);
  }

  return (
    <section className="product-images-editor" aria-labelledby="product-images-title">
      <div className="product-images-heading">
        <div>
          <h3 id="product-images-title">Imagens do produto</h3>
          <p>Envie uma foto ou cole uma URL. A imagem marcada como principal aparece na lista.</p>
        </div>
        <span>{formState.images.length} de 10</span>
      </div>

      <div className="product-image-actions">
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          multiple
          disabled={disabled || processing || formState.images.length >= 10}
          onChange={(event) => void addFiles(event.target.files)}
        />
        <button
          className="secondary-button"
          type="button"
          disabled={disabled || processing || formState.images.length >= 10}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={18} />
          {processing ? "Otimizando..." : "Fazer upload"}
        </button>
        <div className="product-image-url-row">
          <label className="visually-hidden" htmlFor="manual-product-image-url">URL da imagem</label>
          <input
            id="manual-product-image-url"
            type="url"
            placeholder="https://site.com/imagem.jpg"
            value={imageUrlDraft}
            disabled={disabled}
            onChange={(event) => setImageUrlDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addImageUrl();
              }
            }}
          />
          <button type="button" className="secondary-button" disabled={disabled || !imageUrlDraft.trim()} onClick={addImageUrl}>
            <Link2 size={17} />
            Adicionar URL
          </button>
        </div>
      </div>

      {imageError && <p className="product-image-error" role="alert">{imageError}</p>}

      {formState.images.length > 0 ? (
        <div className="product-images-gallery">
          {formState.images.map((image, index) => (
            <article className={`product-image-tile${image.isPrimary ? " is-primary" : ""}`} key={image.id}>
              <button
                className="product-image-preview"
                type="button"
                onClick={() => commitImages(selectPrimaryProductImage(formState.images, image.id))}
                aria-label={`Usar imagem ${index + 1} como principal`}
                aria-pressed={image.isPrimary}
              >
                <img src={image.thumbnailUrl || image.url} alt="" />
                {image.isPrimary && <span><Check size={13} /> Principal</span>}
              </button>
              <div className="product-image-tile-actions">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => commitImages(moveProductImage(formState.images, image.id, -1))}
                  aria-label="Mover imagem para a esquerda"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={index === formState.images.length - 1}
                  onClick={() => commitImages(moveProductImage(formState.images, image.id, 1))}
                  aria-label="Mover imagem para a direita"
                >
                  <ArrowRight size={16} />
                </button>
                <button type="button" onClick={() => removeImage(image)} aria-label="Remover imagem">
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <button
          className="product-images-empty"
          type="button"
          disabled={disabled || processing}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={22} />
          <span>
            <strong>Adicione até 10 imagens</strong>
            <small>JPG, PNG, WebP ou HEIC · otimizadas automaticamente</small>
          </span>
        </button>
      )}
    </section>
  );
}

function AddWishScreen({
  formState,
  extractionState,
  availableLists,
  selectedWishlistId,
  onSelectWishlist,
  onCreateList,
  onBack,
  selectedPriority,
  setFormState,
  setSelectedPriority,
  onSubmit,
  syncing,
}: {
  formState: AddWishFormState;
  extractionState: ProductExtractionState;
  availableLists: HomeListSummary[];
  selectedWishlistId: string | null;
  onSelectWishlist: (wishlistId: string | null) => void;
  onCreateList: () => void;
  onBack: () => void;
  selectedPriority: Priority;
  setFormState: (state: AddWishFormState) => void;
  setSelectedPriority: (priority: Priority) => void;
  onSubmit: () => void;
  syncing: boolean;
}) {
  const [pasteError, setPasteError] = useState("");

  /**
   * Lê a área de transferência só sob clique — é o que os navegadores permitem
   * sem pedir permissão persistente, e evita ler o clipboard sem a pessoa querer.
   */
  async function pasteFromClipboard() {
    try {
      if (!navigator.clipboard?.readText) {
        setPasteError("Cole o link no campo abaixo");
        return;
      }
      const text = await navigator.clipboard.readText();
      const url = extractSharedProductUrl({ text });
      if (!url) {
        setPasteError("Nenhum link copiado");
        return;
      }
      setPasteError("");
      setFormState({ ...formState, productUrl: url });
    } catch {
      setPasteError("Cole o link no campo abaixo");
    }
  }

  return (
    <section className="desktop-flow-layout">
      <form
        className="form-stack desktop-flow-main"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="upload-card">
          <Search size={24} />
          <h2>Cole o link de qualquer produto</h2>
          <p>
            Preenchemos automaticamente nome, foto e preço sempre que possível.
          </p>
          <button className="secondary-button" type="button" onClick={() => void pasteFromClipboard()}>
            <Copy size={18} />
            {pasteError || "Colar link copiado"}
          </button>
        </div>
        <div className="destination-field">
          <label className="field" htmlFor="add-wish-destination">
            <span className="field-label">Lista de destino</span>
            <span className="input-wrap select-wrap">
              <Gift size={18} aria-hidden="true" />
              <select
                id="add-wish-destination"
                value={selectedWishlistId ?? ""}
                onChange={(event) => onSelectWishlist(event.target.value || null)}
                disabled={syncing || availableLists.length === 0}
                required
              >
                <option value="" disabled>
                  Selecione uma lista
                </option>
                {availableLists.map((list) => (
                  <option value={list.id} key={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="select-chevron" size={18} aria-hidden="true" />
            </span>
          </label>
          {availableLists.length > 0 ? (
            <p className="field-hint">
              {selectedWishlistId
                ? "O desejo será salvo nesta lista."
                : "Escolha onde o desejo deve aparecer antes de salvar."}
            </p>
          ) : (
            <div className="destination-empty">
              <p>Você precisa criar uma lista antes de adicionar um desejo.</p>
              <button className="secondary-button" type="button" onClick={onCreateList}>
                <Plus size={18} />
                Criar uma lista
              </button>
            </div>
          )}
        </div>
        <Field
          label="Link do produto"
          placeholder="https://loja.com/produto"
          value={formState.productUrl}
          onChange={(value) => setFormState({ ...formState, productUrl: value })}
        />
        {extractionState.status === "loading" && (
        <div className="product-extraction-card skeleton">
          <div className="product-extraction-skeleton-media" />
          <div className="product-extraction-skeleton-copy">
            <span />
            <span />
            <span />
          </div>
          <p>{extractionState.message || "Buscando dados essenciais do produto"}</p>
        </div>
        )}
        {extractionState.status !== "idle" && extractionState.status !== "loading" && (
          <div className={`sync-banner ${extractionState.status === "error" ? "error" : "success"}`}>{extractionState.message}</div>
        )}
        {extractionState.status !== "loading" && formState.productUrl.trim() && (
          <WishCompletionChecklist
            title={formState.title}
            imageUrl={formState.imageUrl}
            priceText={formState.currentPrice}
            onChangeImage={(value) => {
              const images = isValidHttpUrl(value)
                ? addManualImageUrl(formState.images, value)
                : formState.images;
              setFormState({ ...formState, imageUrl: value, images });
            }}
            onChangePrice={(value) => setFormState({ ...formState, currentPrice: value })}
          />
        )}
        <ProductImageManager formState={formState} setFormState={setFormState} disabled={syncing} />
        {(extractionState.preview || formState.title.trim() || formState.imageUrl.trim()) && (
          <div className="product-extraction-card">
            <img
              src={getPrimaryProductImage(formState.images)?.url || formState.imageUrl.trim() || PRODUCT_PLACEHOLDER_DATA_URL}
              alt=""
            />
            <div className="product-extraction-copy">
              <strong>{formState.title.trim() || "Produto sem nome"}</strong>
              <span>
                {formState.storeName.trim() || "Loja não identificada"}
                {formState.marketplace.trim() ? ` · ${formState.marketplace}` : ""}
              </span>
              <div className="product-extraction-price-row">
                {formState.originalPrice.trim() && <small className="previous-price">{formState.originalPrice}</small>}
                <strong>{formState.cashPrice.trim() || formState.currentPrice.trim() || "Preço não identificado"}</strong>
                {formState.cashPrice.trim() && <span>à vista</span>}
              </div>
              {formState.installmentQuantity && formState.installmentAmount && (
                <p className="product-installment">
                  {formState.installmentQuantity}x de {formState.installmentAmount}
                  {formState.installmentInterestFree === true ? " sem juros" : ""}
                </p>
              )}
              {formState.selectedVariantText.trim() && <p>{formState.selectedVariantText}</p>}
            </div>
          </div>
        )}
        <Field
          label="Nome do desejo"
          placeholder="Poltrona boucle creme"
          value={formState.title}
          onChange={(value) => setFormState({ ...formState, title: value })}
        />
        <Field
          label="Descrição"
          placeholder="Descrição do produto, detalhes ou observações"
          textarea
          value={formState.note}
          onChange={(value) => setFormState({ ...formState, note: value })}
        />
        <div className="field-row split-row">
          <Field
            label="Loja"
            placeholder="Mercado Livre"
            value={formState.storeName}
            onChange={(value) => setFormState({ ...formState, storeName: value })}
          />
          <Field
            label="Marketplace"
            placeholder="mercado_livre"
            value={formState.marketplace}
            onChange={(value) => setFormState({ ...formState, marketplace: value })}
          />
        </div>
        <div className="field-row split-row">
          <Field
            label="Preço à vista"
            placeholder="R$ 189,90"
            value={formState.cashPrice}
            onChange={(value) => setFormState({ ...formState, cashPrice: value })}
          />
          <Field
            label="Quantidade de parcelas"
            placeholder="10"
            value={formState.installmentQuantity}
            onChange={(value) => setFormState({ ...formState, installmentQuantity: value.replace(/\D/g, "").slice(0, 3) })}
          />
        </div>
        <div className="field-row split-row">
          <Field
            label="Valor da parcela"
            placeholder="R$ 19,99"
            value={formState.installmentAmount}
            onChange={(value) => setFormState({ ...formState, installmentAmount: value })}
          />
          <label className="field">
            <span className="field-label">Juros</span>
            <span className="select-wrap">
              <select
                value={formState.installmentInterestFree == null ? "" : formState.installmentInterestFree ? "free" : "with"}
                onChange={(event) => setFormState({
                  ...formState,
                  installmentInterestFree: event.target.value === "" ? null : event.target.value === "free",
                })}
              >
                <option value="">Não identificado</option>
                <option value="free">Sem juros</option>
                <option value="with">Com juros</option>
              </select>
              <ChevronDown className="select-chevron" size={18} aria-hidden="true" />
            </span>
          </label>
        </div>
        <div className="field-row split-row">
          <Field
            label="Preço atual"
            placeholder="R$ 199,90"
            value={formState.currentPrice}
            onChange={(value) => setFormState({ ...formState, currentPrice: value })}
          />
          <Field
            label="Preço anterior"
            placeholder="R$ 249,90"
            value={formState.originalPrice}
            onChange={(value) => setFormState({ ...formState, originalPrice: value })}
          />
        </div>
        <div>
          <p className="field-label">Prioridade</p>
          <div className="segmented">
            {(["Alta", "Media", "Baixa"] as Priority[]).map((priority) => (
              <button
                className={selectedPriority === priority ? "selected" : ""}
                key={priority}
                type="button"
                onClick={() => setSelectedPriority(priority)}
              >
                {priority}
              </button>
            ))}
          </div>
        </div>
        <div className="field-row">
          <button className="secondary-button" type="button" onClick={onBack}>
            Voltar
          </button>
          <button
            className="primary-button full"
            type="submit"
            disabled={
              !selectedWishlistId ||
              !getWishSubmissionReadiness({
                title: formState.title,
                productUrl: formState.productUrl,
                extractionStatus: extractionState.status,
                extractedUrl: extractionState.extractedUrl,
                syncing,
              }).canSubmit
            }
          >
            <Sparkles size={18} />
            {syncing ? "Salvando..." : extractionState.status === "error" ? "Confirmar inclusão manual" : "Salvar desejo"}
          </button>
        </div>
      </form>

      <aside className="desktop-flow-aside">
        <div className="desktop-flow-card">
          <p className="label">Extração automática</p>
          <h2>O link puxa o máximo possível. Você revisa antes de salvar.</h2>
          <p>Nada é salvo automaticamente. O formulário continua totalmente editável, mesmo quando a leitura do link vier incompleta.</p>
        </div>
        <div className="desktop-flow-points">
          <article>
            <strong>Provider específico primeiro</strong>
            <p>Mercado Livre, Shopify e dados estruturados têm prioridade antes do fallback genérico.</p>
          </article>
          <article>
            <strong>Preview antes de salvar</strong>
            <p>Nome, foto, preço e variações aparecem para revisão antes do cadastro final.</p>
          </article>
          <article>
            <strong>Fallback manual</strong>
            <p>Se a leitura falhar, você ainda consegue preencher o item inteiro manualmente.</p>
          </article>
        </div>
      </aside>
    </section>
  );
}

function PublicWishlistPage({
  loading,
  wishlist,
  notFound,
  onBackHome,
  onBuyWish,
  onReserveWish,
  reserving,
  onCreateList,
}: {
  loading: boolean;
  wishlist: PublicWishlist | null;
  notFound: boolean;
  onBackHome: () => void;
  onBuyWish: (wish: DbWish) => void;
  onReserveWish: (wish: DbWish, details: ReserveDetails) => Promise<void>;
  reserving: boolean;
  onCreateList: () => void;
}) {
  const [reserveTarget, setReserveTarget] = useState<DbWish | null>(null);
  const [reserveForm, setReserveForm] = useState<ReserveDetails>({ name: "", email: "", message: "" });
  const [reserveError, setReserveError] = useState("");
  const [reservedName, setReservedName] = useState("");

  function closeReserveDialog() {
    setReserveTarget(null);
    setReserveError("");
  }

  async function submitReservation() {
    if (!reserveTarget) return;
    const name = reserveForm.name.trim();
    const email = reserveForm.email.trim();

    if (!name || !email) {
      setReserveError("Preencha seu nome e e-mail para reservar.");
      return;
    }

    try {
      setReserveError("");
      await onReserveWish(reserveTarget, { name, email, message: reserveForm.message });
      setReservedName(name);
      setReserveTarget(null);
      setReserveForm({ name, email, message: "" });
    } catch (error) {
      setReserveError(getErrorMessage(error));
    }
  }

  if (loading) {
    return (
      <div className="public-page">
        <header className="public-header">
          <button className="brand-lockup" type="button" onClick={onBackHome} aria-label="Voltar para Wishly">
            <img className="wordmark" src={images.logo} alt="Wishly" />
          </button>
        </header>
        <main className="public-main">
          <section className="public-empty-state">
            <p className="label">Abrindo lista compartilhada</p>
            <h2>Carregando os desejos...</h2>
            <p>Estamos preparando a lista para você visualizar tudo em um só lugar.</p>
          </section>
        </main>
      </div>
    );
  }

  if (notFound || !wishlist) {
    return (
      <div className="public-page">
        <header className="public-header">
          <button className="brand-lockup" type="button" onClick={onBackHome} aria-label="Voltar para Wishly">
            <img className="wordmark" src={images.logo} alt="Wishly" />
          </button>
          <button className="primary-button" type="button" onClick={onCreateList}>
            Criar minha lista
          </button>
        </header>
        <main className="public-main">
          <section className="public-empty-state">
            <p className="label">Link indisponível</p>
            <h2>Essa lista não está mais acessível.</h2>
            <p>Confira se o link foi copiado por completo ou volte para criar sua própria lista no Wishly.</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="public-page">
      <header className="public-header">
        <button className="brand-lockup" type="button" onClick={onBackHome} aria-label="Voltar para Wishly">
          <img className="wordmark" src={images.logo} alt="Wishly" />
        </button>
        <div className="public-header-actions">
          <button className="text-button" type="button" onClick={onBackHome}>
            Conhecer Wishly
          </button>
          <button className="primary-button" type="button" onClick={onCreateList}>
            Criar minha lista
          </button>
        </div>
      </header>

      <main className="public-main">
        <section className="public-hero">
          <div className="public-hero-media">
            <img src={resolveListCover(wishlist.cover_image_url, wishlist.title)} alt="" />
          </div>
          <div className="public-hero-copy">
            <p className="label">Lista compartilhada</p>
            <h1>{wishlist.title}</h1>
            <p>{wishlist.message || "Escolha um presente com clareza, sem itens repetidos e sem perder contexto."}</p>
            <div className="public-meta">
              {wishlist.occasion && <span>{wishlist.occasion}</span>}
              {wishlist.event_date && <span>{formatEventDate(wishlist.event_date)}</span>}
              <span>{wishlist.gifts.length} desejos</span>
            </div>
          </div>
        </section>

        <section className="public-summary">
          <div className="stat-grid">
            <Stat value={String(wishlist.gifts.length)} label="desejos" />
            <Stat value={String(wishlist.gifts.filter((wish) => getWishStatus(wish) === "Reservado").length)} label="reservados" />
            <Stat value={String(wishlist.gifts.filter((wish) => getWishPriorityLabel(wish) === "Alta").length)} label="prioridade alta" />
          </div>
        </section>

        <section className="public-wishes-section">
          <div className="section-heading section-heading-stacked">
            <h2>Desejos da lista</h2>
            <p>Reserve o que você vai dar para ninguém repetir o presente. Não precisa criar conta.</p>
          </div>
          <div className="public-wishes-grid">
            {wishlist.gifts.map((wish) => {
              const isReserved = wish.status !== "available";
              return (
                <article className={`public-wish-card ${isReserved ? "is-reserved" : ""}`} key={wish.id}>
                  <img src={getWishImage(wish)} alt="" />
                  <div className="public-wish-copy">
                    <div>
                      <div className="public-wish-head">
                        <h3>{wish.name}</h3>
                        {getWishStatus(wish) && <span className="status-pill">{getWishStatus(wish)}</span>}
                      </div>
                      <p>{getWishStore(wish)}</p>
                      {wish.description && <small>{wish.description}</small>}
                      <strong>{getWishPrice(wish)}</strong>
                    </div>
                    <div className="public-wish-actions">
                      {isReserved ? (
                        <p className="public-wish-reserved-note">Já reservado por outra pessoa.</p>
                      ) : (
                        <button
                          className="primary-button"
                          type="button"
                          onClick={() => {
                            setReserveTarget(wish);
                            setReserveError("");
                          }}
                        >
                          <Heart size={16} />
                          Reservar presente
                        </button>
                      )}
                      <button className="secondary-button buy-button" type="button" onClick={() => onBuyWish(wish)}>
                        <ExternalLink size={16} />
                        Ver presente
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {reservedName && (
        <div className="public-reserve-toast" role="status" aria-live="polite">
          <ShieldCheck size={18} />
          <div>
            <strong>Presente reservado.</strong>
            <span>Reserva registrada para {reservedName}; o item já aparece como reservado na lista.</span>
          </div>
          <button className="icon-button" type="button" onClick={() => setReservedName("")} aria-label="Fechar aviso">
            <X size={18} />
          </button>
        </div>
      )}

      {reserveTarget && (
        <div className="reserve-dialog-backdrop" onClick={reserving ? undefined : closeReserveDialog}>
          <div
            className="reserve-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Reservar ${reserveTarget.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="reserve-dialog-header">
              <div>
                <p className="label">Reservar presente</p>
                <h2>{reserveTarget.name}</h2>
              </div>
              <button className="icon-button" type="button" onClick={closeReserveDialog} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <p className="reserve-dialog-intro">
              A reserva avisa quem criou a lista e esconde o item para os outros convidados. Sem criar conta.
            </p>

            {reserveError && (
              <div className="auth-feedback error" role="alert">
                {reserveError}
              </div>
            )}

            <form
              className="reserve-dialog-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submitReservation();
              }}
            >
              <Field
                label="Seu nome"
                placeholder="Como você quer aparecer"
                value={reserveForm.name}
                onChange={(value) => setReserveForm((current) => ({ ...current, name: value }))}
              />
              <Field
                label="Seu e-mail"
                placeholder="voce@exemplo.com"
                value={reserveForm.email}
                onChange={(value) => setReserveForm((current) => ({ ...current, email: value }))}
                inputType="email"
              />
              <Field
                label="Mensagem (opcional)"
                placeholder="Escreva um recado para quem recebe"
                textarea
                value={reserveForm.message}
                onChange={(value) => setReserveForm((current) => ({ ...current, message: value }))}
              />
              <div className="field-row">
                <button className="secondary-button" type="button" onClick={closeReserveDialog} disabled={reserving}>
                  Cancelar
                </button>
                <button className="primary-button full" type="submit" disabled={reserving}>
                  {reserving ? "Reservando..." : "Confirmar reserva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RadarScreen({
  go,
  priceAlerts,
  wishes,
  onEditAlert,
}: {
  go: (view: View) => void;
  priceAlerts: Record<string, PriceAlert>;
  wishes: Array<LocalWish | DbWish>;
  onEditAlert: (wish: LocalWish | DbWish) => void;
}) {
  const [sortKey, setSortKey] = useState<RadarSortKey>("prioridade");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const radarItems = wishes
    .map((wish) => {
      const alert = priceAlerts[getWishId(wish)];
      return { ...buildRadarItem(wish, Boolean(alert)), alert, alertStatus: getPriceAlertStatus(wish, alert) };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore);
  const sortedItems = useMemo(() => {
    const value = (item: (typeof radarItems)[number]) => {
      const current = getWishAmount(item.wish);
      const target = item.alert?.targetAmount ?? null;
      switch (sortKey) {
        case "preco":
          return current ?? -Infinity;
        case "alvo":
          return target ?? -Infinity;
        case "falta":
          // Alvo atingido primeiro, depois quem está mais perto.
          if (item.alertStatus?.reached) return -1;
          return current != null && target != null ? current - target : Infinity;
        case "queda":
          return getWishDiscountPercent(item.wish);
        default:
          return item.priorityScore;
      }
    };

    return [...radarItems].sort((left, right) => {
      const delta = value(left) - value(right);
      return sortDir === "asc" ? delta : -delta;
    });
  }, [radarItems, sortKey, sortDir]);

  const potentialSavings = radarItems.reduce((sum, item) => sum + item.savingsInCurrency, 0);
  const criticalCount = radarItems.filter((item) => item.state === "critical").length;
  const opportunityCount = radarItems.filter((item) => item.state === "opportunity").length;
  const targetsReached = radarItems.filter((item) => item.alertStatus?.reached).length;
  const trackedCount = radarItems.filter((item) => item.alert).length;

  if (trackedCount === 0) {
    return (
      <section className="radar-summary">
        <p className="label">Radar de preços</p>
        <h2>Nenhum item monitorado ainda.</h2>
        <p>
          Abra sua lista, toque em <strong>Ativar radar</strong> em um desejo e defina o preço que faz sentido para
          você. Avisamos quando ele chegar lá.
        </p>
        <button className="primary-button" type="button" onClick={() => go("list")}>
          <ArrowRight size={18} />
          Escolher itens na lista
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="radar-summary">
        <p className="label">Radar de preços</p>
        {/* A manchete segue o sinal mais forte que existe hoje, para não anunciar economia de R$ 0,00. */}
        <h2>
          {targetsReached > 0
            ? `${targetsReached} ${targetsReached === 1 ? "item chegou" : "itens chegaram"} ao seu preço-alvo`
            : potentialSavings > 0
              ? `Economia potencial de ${formatCurrency(potentialSavings, "BRL")}`
              : `Acompanhando ${formatWishCount(trackedCount)}`}
        </h2>
        <p>O radar prioriza preço-alvo atingido, queda real de preço e risco de estoque.</p>
        <div className="stat-grid">
          <Stat value={String(targetsReached)} label="no preço-alvo" />
          <Stat value={String(opportunityCount)} label="oportunidades" />
          <Stat value={String(criticalCount)} label="críticos" />
        </div>
        <button className="text-button" type="button" onClick={() => go("pro")}>
          <Lock size={18} />
          Receber alertas automáticos com o Pro
        </button>
      </section>
      {/* Desktop: tabela ordenável — comparar muitos itens de uma vez só faz
          sentido com espaço horizontal. No celular ficam os cards. */}
      <section className="radar-table-wrap">
        <table className="radar-table">
          <thead>
            <tr>
              <th scope="col">Desejo</th>
              {RADAR_COLUMNS.map((column) => (
                <th scope="col" key={column.key}>
                  <button
                    type="button"
                    className={sortKey === column.key ? "active" : ""}
                    onClick={() => {
                      if (sortKey === column.key) {
                        setSortDir((current) => (current === "asc" ? "desc" : "asc"));
                      } else {
                        setSortKey(column.key);
                        setSortDir("desc");
                      }
                    }}
                  >
                    {column.label}
                    {sortKey === column.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
              <th scope="col">Alerta</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => {
              const currency = getWishCurrency(item.wish);
              const current = getWishAmount(item.wish);
              const target = item.alert?.targetAmount ?? null;
              const remaining = current != null && target != null ? Math.max(0, current - target) : null;

              return (
                <tr key={getWishId(item.wish)} className={item.alertStatus?.reached ? "is-reached" : ""}>
                  <th scope="row">
                    <img src={getWishImage(item.wish)} alt="" />
                    <span>
                      <strong>{getWishTitle(item.wish)}</strong>
                      <small>{getWishStore(item.wish)}</small>
                    </span>
                  </th>
                  <td>{current != null ? formatCurrency(current, currency) : "—"}</td>
                  <td>{target != null ? formatCurrency(target, currency) : "sem alvo"}</td>
                  <td>{item.alertStatus?.reached ? "atingido" : remaining != null ? formatCurrency(remaining, currency) : "—"}</td>
                  <td>{getWishDrop(item.wish) ?? "0%"}</td>
                  <td>
                    <button className="text-button" type="button" onClick={() => onEditAlert(item.wish)}>
                      <Tag size={14} />
                      {item.alert ? "Editar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="vertical-list radar-cards">
        {radarItems.map((item) => (
          <article className={`radar-row radar-row-${item.state}`} key={getWishId(item.wish)}>
            <img src={getWishImage(item.wish)} alt="" />
            <div>
              <p className="row-title">{getWishTitle(item.wish)}</p>
              <p className="row-meta radar-row-topline">
                {item.statusLabel}
                {!isLocalWish(item.wish) ? ` · ${getWishAvailabilityLabel(item.wish)}` : ""}
                {!isLocalWish(item.wish) && item.wish.provider ? ` · ${formatProviderLabel(item.wish.provider)}` : ""}
              </p>
              <div className="sparkline" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="radar-row-detail">
                <span className={`radar-pill radar-pill-${item.stateTone}`}>
                  {item.alertStatus?.reached ? "No preço-alvo" : item.stateLabel}
                </span>
                <span className="row-meta">{item.metricLabel}</span>
              </div>
              <p className="row-meta">{item.alertStatus?.label ?? item.supportLabel}</p>
              <button className="text-button radar-row-edit" type="button" onClick={() => onEditAlert(item.wish)}>
                <Tag size={14} />
                {item.alert ? "Editar alerta" : "Ativar radar"}
              </button>
            </div>
            <div className="radar-score">
              <strong>{getWishDrop(item.wish) ?? "0%"}</strong>
              <span>{item.isTracked ? `Prioridade ${item.priorityScore}` : "Pausado"}</span>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function ActivityScreen() {
  return (
    <section className="vertical-list">
      {activity.map((item, index) => (
        <article className="activity-row" key={item}>
          <div className="activity-icon">{index === 0 ? <ArrowDown size={18} /> : <Bell size={18} />}</div>
          <div>
            <p>{item}</p>
            <span>{index + 1}h atras</span>
          </div>
        </article>
      ))}
    </section>
  );
}

function ProfileScreen({
  profile,
  isRemoteMode,
  onOpenSettings,
  onOpenPro,
  onSignOut,
}: {
  profile: ProfileFormState;
  isRemoteMode: boolean;
  onOpenSettings: () => void;
  onOpenPro: () => void;
  onSignOut: () => void;
}) {
  return (
    <section className="profile-stack">
      <article className="profile-summary-card">
        <img className="profile-summary-avatar" src={profile.avatarUrl || images.avatar} alt={profile.fullName} />
        <div className="profile-summary-copy">
          <p className="label">Sua conta</p>
          <h2>{profile.fullName}</h2>
          <p>{profile.email}</p>
        </div>
      </article>

      <div className="profile-menu-list">
        <button className="profile-menu-item" type="button" onClick={onOpenSettings}>
          <span className="profile-menu-icon">
            <Settings size={18} />
          </span>
          <div>
            <strong>Configurações da conta</strong>
            <p>Foto, nome, e-mail, senha e privacidade.</p>
          </div>
          <ArrowRight size={18} />
        </button>

        <button className="profile-menu-item" type="button" onClick={onOpenPro}>
          <span className="profile-menu-icon">
            <Sparkles size={18} />
          </span>
          <div>
            <strong>Wishly Pro</strong>
            <p>Radar de preço, alertas e experiência premium.</p>
          </div>
          <ArrowRight size={18} />
        </button>
      </div>

      {isRemoteMode ? (
        <button className="secondary-button profile-signout" type="button" onClick={onSignOut}>
          <LogOut size={18} />
          Sair da conta
        </button>
      ) : (
        <div className="profile-note-card">
          <p className="label">Modo local</p>
          <h3>Edite o perfil e veja o layout pronto</h3>
          <p>No ambiente conectado, a foto e o nome passam a ser salvos na sua conta real.</p>
        </div>
      )}
    </section>
  );
}

function ProfileSettingsScreen({
  profileForm,
  accessForm,
  privacyForm,
  deletionRequestedAt,
  syncing,
  meliConnecting,
  isRemoteMode,
  isAdmin,
  meliConnection,
  onChangeField,
  onChangeAccessField,
  onChangePrivacyField,
  onChoosePhoto,
  onConnectMercadoLivre,
  onSave,
  onSaveEmail,
  onSavePassword,
  onSavePrivacy,
  onRequestDeletion,
}: {
  profileForm: ProfileFormState;
  accessForm: AccessFormState;
  privacyForm: PrivacyFormState;
  deletionRequestedAt: string | null;
  syncing: boolean;
  meliConnecting: boolean;
  isRemoteMode: boolean;
  isAdmin: boolean;
  meliConnection: MercadoLivreConnectionStatus | null;
  onChangeField: <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => void;
  onChangeAccessField: <K extends keyof AccessFormState>(field: K, value: AccessFormState[K]) => void;
  onChangePrivacyField: <K extends keyof PrivacyFormState>(field: K, value: PrivacyFormState[K]) => void;
  onChoosePhoto: () => void;
  onConnectMercadoLivre: () => void;
  onSave: () => void;
  onSaveEmail: () => void;
  onSavePassword: () => void;
  onSavePrivacy: () => void;
  onRequestDeletion: () => void;
}) {
  return (
    <section className="profile-settings-layout">
      <div className="profile-settings-main">
        <article className="profile-settings-card">
          <div className="profile-settings-header">
          <div>
            <p className="label">Perfil</p>
            <h2>Seus dados principais</h2>
            <p>Atualize a foto e o nome usados na sua conta.</p>
          </div>
            <div className="profile-avatar-editor">
              <img className="profile-settings-avatar" src={profileForm.avatarUrl || images.avatar} alt={profileForm.fullName} />
              <button className="secondary-button" type="button" onClick={onChoosePhoto}>
                <Upload size={18} />
                Trocar foto
              </button>
            </div>
          </div>

          <div className="profile-settings-fields">
            <Field
              label="Nome completo"
              placeholder="Gabriel Fachini"
              value={profileForm.fullName}
              onChange={(value) => onChangeField("fullName", value)}
              autoComplete="name"
            />
            <Field
              label="E-mail"
              placeholder="voce@exemplo.com"
              value={profileForm.email}
              onChange={() => undefined}
              disabled
              autoComplete="email"
            />
          </div>

          <div className="field-row">
            <button className="primary-button full" type="button" onClick={onSave} disabled={!profileForm.fullName.trim() || syncing}>
              {syncing ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </article>

        {isAdmin ? <article className="profile-settings-card">
          <div>
            <p className="label">Integrações</p>
            <h2>Mercado Livre da plataforma</h2>
            <p>
              Esta conexão administrativa habilita a extração oficial para todos os usuários do Wishly.
            </p>
          </div>

          {isRemoteMode && meliConnection ? (
            <div className="danger-status">
              <strong>Conectado como usuário {meliConnection.meli_user_id}</strong>
              <p>
                Vinculado em {formatDateTime(meliConnection.connected_at)}
                {meliConnection.last_refreshed_at ? ` · última atualização em ${formatDateTime(meliConnection.last_refreshed_at)}` : ""}
              </p>
            </div>
          ) : null}

          <div className="field-row">
            <button className="primary-button full" type="button" onClick={onConnectMercadoLivre} disabled={!isRemoteMode || meliConnecting}>
              {meliConnecting ? "Conectando..." : meliConnection ? "Reconectar Mercado Livre" : "Conectar Mercado Livre"}
            </button>
          </div>

          {!isRemoteMode ? (
            <p className="field-help">Entre na sua conta antes de iniciar a conexão.</p>
          ) : (
            <p className="field-help">O fluxo abre a autorização oficial do Mercado Livre e retorna para esta tela.</p>
          )}
        </article> : null}

        <article className="profile-settings-card">
          <div>
            <p className="label">Acesso</p>
            <h2>Trocar e-mail</h2>
            <p>{isRemoteMode ? "O Supabase pode pedir confirmação no novo e-mail para concluir a troca." : "No modo local, a mudança fica salva apenas neste navegador."}</p>
          </div>

          <div className="profile-settings-fields">
            <Field
              label="Novo e-mail"
              placeholder="voce@exemplo.com"
              value={accessForm.nextEmail}
              onChange={(value) => onChangeAccessField("nextEmail", value)}
              autoComplete="email"
            />
          </div>

          <div className="field-row">
            <button className="primary-button full" type="button" onClick={onSaveEmail} disabled={!accessForm.nextEmail.trim() || syncing}>
              {syncing ? "Salvando..." : "Atualizar e-mail"}
            </button>
          </div>
        </article>

        <article className="profile-settings-card">
          <div>
            <p className="label">Segurança</p>
            <h2>Trocar senha</h2>
            <p>Confirme sua senha atual antes de definir uma nova.</p>
          </div>

          <div className="profile-settings-fields">
            <Field
              label="Senha atual"
              placeholder="Sua senha atual"
              value={accessForm.currentPassword}
              onChange={(value) => onChangeAccessField("currentPassword", value)}
              inputType="password"
              autoComplete="current-password"
            />
            <Field
              label="Nova senha"
              placeholder="Nova senha"
              value={accessForm.newPassword}
              onChange={(value) => onChangeAccessField("newPassword", value)}
              inputType="password"
              autoComplete="new-password"
            />
            <Field
              label="Confirmar nova senha"
              placeholder="Repita a nova senha"
              value={accessForm.confirmNewPassword}
              onChange={(value) => onChangeAccessField("confirmNewPassword", value)}
              inputType="password"
              autoComplete="new-password"
            />
          </div>

          <div className="field-row">
            <button
              className="primary-button full"
              type="button"
              onClick={onSavePassword}
              disabled={!accessForm.currentPassword.trim() || !accessForm.newPassword.trim() || !accessForm.confirmNewPassword.trim() || syncing}
            >
              {syncing ? "Salvando..." : "Atualizar senha"}
            </button>
          </div>
        </article>

        <article className="profile-settings-card">
          <div>
            <p className="label">Privacidade</p>
            <h2>Controle de visibilidade</h2>
            <p>Defina como sua conta e suas novas listas se comportam por padrão.</p>
          </div>

          <div className="privacy-option-list">
            <div className="privacy-option-row">
              <div>
                <strong>Perfil</strong>
                <p>Escolha se sua conta fica mais aberta ou mais reservada.</p>
              </div>
              <div className="segmented segmented-compact">
                <button
                  className={privacyForm.profileVisibility === "private" ? "selected" : ""}
                  type="button"
                  onClick={() => onChangePrivacyField("profileVisibility", "private")}
                >
                  Privado
                </button>
                <button
                  className={privacyForm.profileVisibility === "public" ? "selected" : ""}
                  type="button"
                  onClick={() => onChangePrivacyField("profileVisibility", "public")}
                >
                  Público
                </button>
              </div>
            </div>

            <div className="privacy-option-row">
              <div>
                <strong>Novas listas</strong>
                <p>Defina a visibilidade padrão ao criar novas listas.</p>
              </div>
              <div className="segmented segmented-compact">
                <button
                  className={privacyForm.defaultListVisibility === "private" ? "selected" : ""}
                  type="button"
                  onClick={() => onChangePrivacyField("defaultListVisibility", "private")}
                >
                  Privadas
                </button>
                <button
                  className={privacyForm.defaultListVisibility === "public" ? "selected" : ""}
                  type="button"
                  onClick={() => onChangePrivacyField("defaultListVisibility", "public")}
                >
                  Públicas
                </button>
              </div>
            </div>
          </div>

          <div className="field-row">
            <button className="primary-button full" type="button" onClick={onSavePrivacy} disabled={syncing}>
              {syncing ? "Salvando..." : "Salvar privacidade"}
            </button>
          </div>
        </article>

        <article className="profile-settings-card danger-card">
          <div>
            <p className="label">Zona de perigo</p>
            <h2>Solicitar exclusão da conta</h2>
            <p>
              Essa solicitação marca a conta para remoção. Digite <strong>EXCLUIR</strong> para confirmar.
            </p>
          </div>

          {deletionRequestedAt ? (
            <div className="danger-status">
              <strong>Solicitado em {formatDateTime(deletionRequestedAt)}</strong>
              <p>A conta já foi marcada para exclusão e deve seguir o fluxo administrativo.</p>
            </div>
          ) : null}

          <Field
            label="Confirmação"
            placeholder="Digite EXCLUIR"
            value={privacyForm.deleteConfirmText}
            onChange={(value) => onChangePrivacyField("deleteConfirmText", value)}
          />

          <div className="field-row">
            <button
              className="secondary-button danger-button"
              type="button"
              onClick={onRequestDeletion}
              disabled={syncing || privacyForm.deleteConfirmText.trim().toUpperCase() !== "EXCLUIR"}
            >
              {syncing ? "Processando..." : "Solicitar exclusão"}
            </button>
          </div>
        </article>
      </div>

      <aside className="profile-settings-aside">
        <div className="profile-note-card">
          <p className="label">Perfil</p>
          <h3>Foto e nome já funcionais</h3>
          <p>{isRemoteMode ? "As alterações são salvas na sua conta e refletidas no app." : "No modo local, as alterações ficam salvas neste navegador."}</p>
        </div>
        <div className="profile-note-card">
          <p className="label">Acesso</p>
          <h3>E-mail e senha agora entram aqui</h3>
          <p>Os fluxos foram separados para reduzir erro do usuário e manter a tela objetiva.</p>
        </div>
        <div className="profile-note-card">
          <p className="label">Conta</p>
          <h3>Exclusão com trilha clara</h3>
          <p>A remoção definitiva exige backend privilegiado. Por enquanto a conta fica marcada para exclusão de forma explícita.</p>
        </div>
      </aside>
    </section>
  );
}

function AdminTemplatesSection({
  templates,
  busy,
  onSaveTemplate,
  onDeleteTemplate,
  onAddItem,
  onDeleteItem,
}: {
  templates: ListTemplate[];
  busy: boolean;
  onSaveTemplate: (input: { id?: string; title: string; description: string; coverImageUrl: string; published: boolean }) => void;
  onDeleteTemplate: (templateId: string) => void;
  onAddItem: (input: {
    templateId: string;
    name: string;
    productUrl: string;
    affiliateUrl: string;
    storeName: string;
    imageUrl: string;
    price: string;
  }) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  const [draft, setDraft] = useState({ title: "", description: "", coverImageUrl: "", published: false });
  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState({ name: "", productUrl: "", affiliateUrl: "", storeName: "", imageUrl: "", price: "" });

  return (
    <section className="admin-stack">
      <div className="admin-summary">
        <p className="label">Listas modelo</p>
        <h2>Modelos com produtos curados</h2>
        <p>
          O modelo publicado aparece em "Ideias para começar" e na landing. Quem usa recebe a lista com os itens dentro,
          e o link de afiliado é preservado.
        </p>
      </div>

      <article className="admin-card">
        <div className="admin-card-head">
          <strong>Novo modelo</strong>
        </div>
        <Field label="Título" placeholder="Enxoval de chá de bebê" value={draft.title} onChange={(value) => setDraft({ ...draft, title: value })} />
        <Field
          label="Descrição"
          placeholder="O essencial para as primeiras semanas."
          value={draft.description}
          onChange={(value) => setDraft({ ...draft, description: value })}
        />
        <Field
          label="Capa (URL, opcional)"
          placeholder="https://..."
          value={draft.coverImageUrl}
          onChange={(value) => setDraft({ ...draft, coverImageUrl: value })}
        />
        <div className="admin-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => setDraft({ ...draft, published: !draft.published })}
            disabled
            title="Crie o modelo como rascunho, adicione os produtos e publique depois."
          >
            Rascunho
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={!draft.title.trim() || busy}
            onClick={() => {
              onSaveTemplate({ ...draft, title: draft.title.trim() });
              setDraft({ title: "", description: "", coverImageUrl: "", published: false });
            }}
          >
            Criar modelo
          </button>
        </div>
      </article>

      {templates.length === 0 ? (
        <div className="empty-admin">
          <Gift size={24} />
          <strong>Nenhum modelo cadastrado</strong>
          <p>Crie um modelo e adicione produtos com link de afiliado para ele aparecer no app.</p>
        </div>
      ) : (
        templates.map((template) => (
          <article className="admin-card" key={template.id}>
            <div className="admin-card-head">
              <strong>{template.title}</strong>
              <span className={`status-pill ${template.published ? "" : "muted"}`}>
                {template.published ? "Publicado" : "Rascunho"}
              </span>
            </div>
            <div className="admin-meta">
              <span>{template.items.length > 0 ? formatWishCount(template.items.length) : "Sem itens"}</span>
              <span>/{template.slug}</span>
            </div>

            {template.items.length > 0 && (
              <div className="admin-template-items">
                {template.items.map((item) => (
                  <div className="admin-template-item" key={item.id}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.store_name || "Loja não informada"}
                        {item.estimated_price != null ? ` · ${formatCurrency(item.estimated_price, item.currency)}` : ""}
                        {item.affiliate_url ? " · afiliado ok" : " · sem afiliado"}
                      </small>
                    </span>
                    <button className="text-button" type="button" onClick={() => onDeleteItem(item.id)} disabled={busy}>
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="admin-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setOpenTemplateId(openTemplateId === template.id ? null : template.id)}
              >
                <Plus size={16} />
                Adicionar item
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={
                  busy
                  || (!template.published && (
                    template.items.length === 0
                    || template.items.some((item) => !item.affiliate_url?.trim())
                  ))
                }
                onClick={() =>
                  onSaveTemplate({
                    id: template.id,
                    title: template.title,
                    description: template.description ?? "",
                    coverImageUrl: template.cover_image_url ?? "",
                    published: !template.published,
                  })
                }
                title={
                  !template.published && template.items.length === 0
                    ? "Adicione produtos antes de publicar."
                    : !template.published && template.items.some((item) => !item.affiliate_url?.trim())
                      ? "Todos os produtos precisam de link de afiliado."
                      : undefined
                }
              >
                {template.published ? "Despublicar" : "Publicar"}
              </button>
              <button className="secondary-button danger-button" type="button" disabled={busy} onClick={() => onDeleteTemplate(template.id)}>
                <Trash2 size={16} />
                Excluir modelo
              </button>
            </div>

            {openTemplateId === template.id && (
              <div className="admin-template-form">
                <Field label="Nome do produto" placeholder="Móbile para berço" value={itemDraft.name} onChange={(value) => setItemDraft({ ...itemDraft, name: value })} />
                <Field label="Link do produto" placeholder="https://produto.mercadolivre.com.br/..." value={itemDraft.productUrl} onChange={(value) => setItemDraft({ ...itemDraft, productUrl: value })} />
                <Field label="Link de afiliado" placeholder="https://mercadolivre.com/sec/..." value={itemDraft.affiliateUrl} onChange={(value) => setItemDraft({ ...itemDraft, affiliateUrl: value })} />
                <div className="field-row split-row">
                  <Field label="Loja" placeholder="Mercado Livre" value={itemDraft.storeName} onChange={(value) => setItemDraft({ ...itemDraft, storeName: value })} />
                  <Field label="Preço" placeholder="189,90" value={itemDraft.price} onChange={(value) => setItemDraft({ ...itemDraft, price: value })} />
                </div>
                <Field label="Imagem (URL)" placeholder="https://..." value={itemDraft.imageUrl} onChange={(value) => setItemDraft({ ...itemDraft, imageUrl: value })} />
                <div className="admin-actions">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={
                      !itemDraft.name.trim()
                      || !itemDraft.productUrl.trim()
                      || !itemDraft.affiliateUrl.trim()
                      || busy
                    }
                    onClick={() => {
                      onAddItem({ templateId: template.id, ...itemDraft });
                      setItemDraft({ name: "", productUrl: "", affiliateUrl: "", storeName: "", imageUrl: "", price: "" });
                    }}
                  >
                    Salvar item
                  </button>
                </div>
              </div>
            )}
          </article>
        ))
      )}
    </section>
  );
}

function AdminScreen({
  isRemoteMode,
  isAdmin,
  remoteQueue,
  remoteDeletionRequests,
  localTasks,
  draftAffiliateUrls,
  onAffiliateChange,
  onRemoteApply,
  onRemoteFail,
  onRemoteDeletionProcess,
  onRemoteDeletionCancel,
  onLocalApply,
  onLocalInvalid,
  onLocalUnavailable,
  templatesSection,
}: {
  isRemoteMode: boolean;
  isAdmin: boolean;
  remoteQueue: AdminAffiliateQueueItem[];
  remoteDeletionRequests: AdminAccountDeletionRequest[];
  localTasks: LocalAffiliateTask[];
  draftAffiliateUrls: Record<string, string>;
  onAffiliateChange: (taskId: string, value: string) => void;
  onRemoteApply: (giftId: string) => void;
  onRemoteFail: (giftId: string) => void;
  onRemoteDeletionProcess: (requestId: string) => void;
  onRemoteDeletionCancel: (requestId: string) => void;
  onLocalApply: (taskId: string) => void;
  onLocalInvalid: (taskId: string) => void;
  onLocalUnavailable: (taskId: string) => void;
  templatesSection: React.ReactNode;
}) {
  if (isRemoteMode && !isAdmin) {
    return (
      <section className="admin-stack">
        <div className="empty-admin">
          <ShieldCheck size={24} />
          <strong>Acesso restrito</strong>
          <p>Essa fila real só aparece para usuários presentes em `admin_users` no Supabase.</p>
        </div>
      </section>
    );
  }

  if (isRemoteMode) {
    const pending = remoteQueue.filter((item) => item.affiliate_status !== "generated");
    const history = remoteQueue.filter((item) => item.affiliate_status === "generated");
    const pendingDeletionRequests = remoteDeletionRequests.filter((item) => item.status === "pending");
    const resolvedDeletionRequests = remoteDeletionRequests.filter((item) => item.status !== "pending");

    return (
      <>
      {templatesSection}
      <section className="admin-stack">
        <div className="admin-summary">
          <p className="label">Operação real</p>
          <h2>Fila única para admins</h2>
          <p>Essa tela usa RPCs do Supabase para afiliados e exclusão de conta.</p>
          <div className="stat-grid">
            <Stat value={String(pending.length)} label="pendentes" />
            <Stat value={String(pendingDeletionRequests.length)} label="exclusões" />
            <Stat value={String(remoteQueue.length + remoteDeletionRequests.length)} label="total" />
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="empty-admin">
            <ShieldCheck size={24} />
            <strong>Nenhuma pendência aberta</strong>
            <p>Se um gift entrar com merchant manual e link fallback, ele aparece aqui automaticamente.</p>
          </div>
        ) : (
          pending.map((task) => (
            <article className="admin-card" key={task.gift_id}>
              <div className="admin-card-head">
                <div>
                  <p className="label">Pendente</p>
                  <h3>{task.item_title}</h3>
                </div>
                <span className="status-pill">{task.store_name?.trim() || task.merchant_name}</span>
              </div>
              <div className="admin-meta">
                <span>Lista: {task.wishlist_title}</span>
                <span>Dono: {task.owner_name ?? task.owner_email}</span>
              </div>
              <div className="admin-meta">
                <span>Origem: {task.provider ? formatProviderLabel(task.provider) : task.merchant_name}</span>
                <span>Autofill: {getAdminAutofillStatusLabel(task)}</span>
                <span>Disponibilidade: {getAdminAvailabilityLabel(task)}</span>
              </div>
              {(task.current_price != null || task.original_price != null) && (
                <div className="admin-meta">
                  <span>Atual: {formatCurrency(task.current_price, "BRL")}</span>
                  <span>Anterior: {formatCurrency(task.original_price, "BRL")}</span>
                </div>
              )}
              <label className="link-block">
                <span className="field-label">Original URL</span>
                <div className="link-line">
                  <code>{task.original_url}</code>
                  <button className="icon-button" type="button" onClick={() => openLink(task.original_url)} aria-label="Abrir link original">
                    <ExternalLink size={18} />
                  </button>
                </div>
              </label>
              {task.canonical_url && task.canonical_url !== task.original_url && (
                <label className="link-block">
                  <span className="field-label">Canonical URL</span>
                  <div className="link-line">
                    <code>{task.canonical_url}</code>
                    <button className="icon-button" type="button" onClick={() => openLink(task.canonical_url!)} aria-label="Abrir link canonico">
                      <ExternalLink size={18} />
                    </button>
                  </div>
                </label>
              )}
              <Field
                label="Affiliate URL"
                placeholder="https://..."
                value={draftAffiliateUrls[task.gift_id] ?? task.affiliate_url ?? ""}
                onChange={(value) => onAffiliateChange(task.gift_id, value)}
              />
              <div className="admin-actions">
                <button className="secondary-button" type="button" onClick={() => onRemoteFail(task.gift_id)}>
                  <XCircle size={18} />
                  Sem afiliado
                </button>
                <button className="primary-button" type="button" onClick={() => onRemoteApply(task.gift_id)}>
                  <Check size={18} />
                  Aplicar link
                </button>
              </div>
            </article>
          ))
        )}

        {pendingDeletionRequests.length === 0 ? (
          <div className="empty-admin">
            <ShieldCheck size={24} />
            <strong>Nenhuma exclusão aguardando ação</strong>
            <p>Quando um usuário solicitar remoção da conta, o pedido aparece aqui.</p>
          </div>
        ) : (
          pendingDeletionRequests.map((request) => (
            <article className="admin-card danger-card" key={request.id}>
              <div className="admin-card-head">
                <div>
                  <p className="label">Exclusao pendente</p>
                  <h3>{request.requested_name ?? request.requested_email}</h3>
                </div>
                <span className="status-pill">conta</span>
              </div>
              <div className="admin-meta">
                <span>{request.requested_email}</span>
                <span>Solicitado em {formatDateTime(request.requested_at)}</span>
              </div>
              <div className="admin-actions">
                <button className="secondary-button" type="button" onClick={() => onRemoteDeletionCancel(request.id)}>
                  <XCircle size={18} />
                  Cancelar pedido
                </button>
                <button className="primary-button" type="button" onClick={() => onRemoteDeletionProcess(request.id)}>
                  <Check size={18} />
                  Marcar processado
                </button>
              </div>
            </article>
          ))
        )}

        {history.length > 0 && (
          <div className="history-block">
            <div className="section-heading compact-heading">
              <h2>Histórico</h2>
            </div>
            <div className="vertical-list admin-history">
              {history.map((task) => (
                <article className="activity-row" key={task.gift_id}>
                  <div className="activity-icon">
                    <Check size={18} />
                  </div>
                  <div>
                    <p>
                      {task.item_title} • afiliado aplicado
                    </p>
                    <span>{task.merchant_name}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {resolvedDeletionRequests.length > 0 && (
          <div className="history-block">
            <div className="section-heading compact-heading">
              <h2>Exclusoes resolvidas</h2>
            </div>
            <div className="vertical-list admin-history">
              {resolvedDeletionRequests.map((request) => (
                <article className="activity-row" key={request.id}>
                  <div className="activity-icon">
                    <Check size={18} />
                  </div>
                  <div>
                    <p>
                      {request.requested_name ?? request.requested_email} • {request.status}
                    </p>
                    <span>{request.processed_at ? formatDateTime(request.processed_at) : "Sem data"}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
      </>
    );
  }

  const pending = localTasks.filter((task) => task.status === "pending");
  const history = localTasks.filter((task) => task.status !== "pending");

  return (
    <section className="admin-stack">
      <div className="admin-summary">
        <p className="label">Operação local</p>
        <h2>Fila demo para admins</h2>
        <p>Essa fila continua disponível como fallback enquanto você não estiver autenticado no banco real.</p>
        <div className="stat-grid">
          <Stat value={String(pending.length)} label="pendentes" />
          <Stat value={String(history.filter((task) => task.status === "completed").length)} label="gerados" />
          <Stat value={String(history.length)} label="encerrados" />
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="empty-admin">
          <ShieldCheck size={24} />
          <strong>Nenhuma pendência aberta</strong>
          <p>Ao adicionar um item do Mercado Livre no modo local, a plataforma cria uma task simulada para todos os admins.</p>
        </div>
      ) : (
        pending.map((task) => {
          const key = String(task.id);
          return (
            <article className="admin-card" key={task.id}>
              <div className="admin-card-head">
                <div>
                  <p className="label">Pendente</p>
                  <h3>{task.itemTitle}</h3>
                </div>
                <span className="status-pill">Mercado Livre</span>
              </div>
              <div className="admin-meta">
                <span>Lista: {task.wishlistName}</span>
                <span>Criado por: {task.createdByUserName}</span>
              </div>
              <label className="link-block">
                <span className="field-label">Original URL</span>
                <div className="link-line">
                  <code>{task.originalUrl}</code>
                  <button className="icon-button" type="button" onClick={() => openLink(task.originalUrl)} aria-label="Abrir link original">
                    <ExternalLink size={18} />
                  </button>
                </div>
              </label>
              <Field
                label="Affiliate URL"
                placeholder="https://..."
                value={draftAffiliateUrls[key] ?? ""}
                onChange={(value) => onAffiliateChange(key, value)}
              />
              <div className="admin-actions">
                <button className="secondary-button" type="button" onClick={() => onLocalInvalid(key)}>
                  <XCircle size={18} />
                  Marcar inválido
                </button>
                <button className="secondary-button" type="button" onClick={() => onLocalUnavailable(key)}>
                  Sem afiliado
                </button>
                <button className="primary-button" type="button" onClick={() => onLocalApply(key)}>
                  <Check size={18} />
                  Aplicar link
                </button>
              </div>
            </article>
          );
        })
      )}

      {history.length > 0 && (
        <div className="history-block">
          <div className="section-heading compact-heading">
            <h2>Histórico</h2>
          </div>
          <div className="vertical-list admin-history">
            {history.map((task) => (
              <article className="activity-row" key={task.id}>
                <div className="activity-icon">{task.status === "completed" ? <Check size={18} /> : <Bell size={18} />}</div>
                <div>
                  <p>
                    {task.itemTitle} • {task.status}
                  </p>
                  <span>{task.completedByAdminName ?? localAdminName}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const PRO_FREE_FEATURES = [
  "Listas e desejos ilimitados",
  "Preencher item colando o link",
  "Compartilhar e receber reservas",
];

const PRO_PAID_FEATURES = [
  "Alertas automáticos de preço-alvo",
  "Histórico de preço por loja",
  "Radar sem limite de itens",
  "Temas editoriais premium",
];

function ProScreen({ go }: { go: (view: View) => void }) {
  return (
    <>
      <section className="pro-hero">
        <Sparkles size={28} />
        <h2>Wishly Pro</h2>
        <p>Guardar desejos e compartilhar é grátis. O Pro cuida do preço no seu lugar.</p>
        <strong>R$ 14,90 / mês</strong>
        <button className="primary-button full" type="button" onClick={() => go("checkout")}>
          Começar agora
        </button>
      </section>
      <section className="plan-compare">
        <article>
          <p className="label">Sempre grátis</p>
          <div className="feature-list">
            {PRO_FREE_FEATURES.map((item) => (
              <div className="feature" key={item}>
                <Check size={18} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
        <article>
          <p className="label">No Pro</p>
          <div className="feature-list">
            {PRO_PAID_FEATURES.map((item) => (
              <div className="feature" key={item}>
                <Check size={18} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

function CheckoutScreen({ go }: { go: (view: View) => void }) {
  return (
    <section className="form-stack">
      <div className="plan-card">
        <span>Wishly Pro</span>
        <strong>R$ 14,90</strong>
        <small>Renovação mensal. Cancele quando quiser.</small>
      </div>
      <div className="empty-state">
        <Clock3 size={26} />
        <h3>O pagamento ainda não está aberto.</h3>
        <p>
          Estamos finalizando a cobrança do Pro. Enquanto isso, o radar com preço-alvo continua disponível nas suas
          listas e avisamos aqui quando a assinatura abrir.
        </p>
        <button className="primary-button" type="button" onClick={() => go("radar")}>
          <ArrowRight size={18} />
          Voltar ao radar
        </button>
      </div>
    </section>
  );
}

function SuccessScreen({ go }: { go: (view: View) => void }) {
  return (
    <section className="success-card">
      <div className="success-icon">
        <Check size={36} />
      </div>
      <h2>Tudo pronto</h2>
      <p>Seus alertas de preço estão ativos nas listas. Avisamos quando um item chegar ao preço-alvo.</p>
      <button className="primary-button full" type="button" onClick={() => go("radar")}>
        Abrir radar
      </button>
    </section>
  );
}

function Shelf({
  title,
  action,
  children,
  tone,
  variant,
}: {
  title: string;
  action?: string;
  children: React.ReactNode;
  tone?: "tertiary";
  variant?: "lists" | "ideas" | "wishes";
}) {
  return (
    <section className={`shelf ${tone ?? ""}`}>
      <div className="section-heading">
        <h2>{title}</h2>
        {action && <button type="button">{action}</button>}
      </div>
      <div className={`horizontal-shelf ${variant ? `shelf-${variant}` : ""}`}>{children}</div>
    </section>
  );
}

function ListCard({
  image,
  title,
  meta,
  badge,
  onClick,
}: {
  image: string;
  title: string;
  meta: string;
  badge: string;
  onClick?: () => void;
}) {
  return (
    <button className="list-card" type="button" onClick={onClick}>
      <div className="image-frame">
        <img src={image} alt="" />
        <span>{badge}</span>
      </div>
      <h3>{title}</h3>
      <p>{meta}</p>
    </button>
  );
}

function WishCard({
  wish,
  alert,
  onTrack,
  onBuy,
  onComplete,
  onEdit,
  onMarkPurchased,
  onDelete,
}: {
  wish: LocalWish | DbWish;
  alert: PriceAlert | undefined;
  onTrack: () => void;
  onBuy: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onMarkPurchased: () => void;
  onDelete: () => void;
}) {
  const incomplete = isWishIncomplete(wish);
  const isMercadoLivre = getWishProvider(wish) === "mercado_livre";
  const tracked = Boolean(alert);
  const alertStatus = getPriceAlertStatus(wish, alert);
  const isPurchased = getWishStatus(wish) === "Comprado";

  return (
    <article className={`wish-card${isMercadoLivre ? " wish-card--marketplace" : ""}${isPurchased ? " wish-card--purchased" : ""}`}>
      <div className="wish-card-media">
        <img src={getWishImage(wish)} alt="" className={isMercadoLivre ? "wish-card-marketplace-image" : ""} />
      </div>
      <div className="wish-copy">
        <div>
          <h3>{getWishTitle(wish)}</h3>
          <p>{getWishStore(wish)}</p>
          <span>{getWishPrice(wish)}</span>
          {isPurchased && (
            <p className="wish-alert-note is-reached">
              <Check size={14} />
              Comprado
            </p>
          )}
          {incomplete && (
            <button className="wish-incomplete-note" type="button" onClick={onComplete}>
              <PencilLine size={13} aria-hidden="true" />
              {getMissingWishFields({
                imageUrl: getWishImageUrlRaw(wish),
                priceInCents: toCentsOrNull(getWishAmount(wish)),
              })
                .map((field) => getMissingWishFieldCopy(field).label.toLowerCase())
                .join(" e ")}{" "}
              faltando · completar
            </button>
          )}
          {alertStatus && (
            <p className={`wish-alert-note ${alertStatus.reached ? "is-reached" : ""}`}>
              {alertStatus.reached ? <Check size={14} /> : <TrendingDown size={14} />}
              {alertStatus.label}
            </p>
          )}
        </div>
        <div className="wish-actions">
          <button className={tracked ? "tracked" : ""} type="button" onClick={onTrack}>
            <Tag size={15} />
            {tracked ? "Radar ativo" : "Ativar radar"}
          </button>
          <button className="secondary-button buy-button" type="button" onClick={onBuy}>
            <ExternalLink size={16} />
            Comprar
          </button>
          <button className="icon-button" type="button" onClick={onEdit} aria-label={`Editar ${getWishTitle(wish)}`}>
            <PencilLine size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={onMarkPurchased}
            aria-label={`Marcar ${getWishTitle(wish)} como comprado`}
            disabled={isPurchased}
          >
            <Check size={16} />
          </button>
          <button className="icon-button danger" type="button" onClick={onDelete} aria-label={`Excluir ${getWishTitle(wish)}`}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

function Notice({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="notice">
      <span>{icon}</span>
      <p>{text}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Field({
  label,
  placeholder,
  textarea,
  icon,
  value,
  onChange,
  disabled,
  inputType,
  autoComplete,
  maxLength,
}: {
  label: string;
  placeholder: string;
  textarea?: boolean;
  icon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputType?: string;
  autoComplete?: string;
  maxLength?: number;
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = inputType === "password";

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-wrap">
        {icon}
        {textarea ? (
          <textarea placeholder={placeholder} rows={4} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
        ) : (
          <input
            type={isPassword && passwordVisible ? "text" : inputType ?? "text"}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            autoComplete={autoComplete}
            maxLength={maxLength}
          />
        )}
        {isPassword && (
          <button
            className="password-toggle"
            type="button"
            onClick={() => setPasswordVisible((current) => !current)}
            aria-label={passwordVisible ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={passwordVisible}
          >
            {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </span>
    </label>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} type="button" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SidebarItem({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`app-sidebar-item ${active ? "active" : ""}`} type="button" onClick={onClick} aria-current={active ? "page" : undefined}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function mergeExtractedProductIntoForm(formState: AddWishFormState, result: ProductExtractionResult): AddWishFormState {
  const source = result.provider === "mercado_livre" || result.provider === "amazon"
    ? "marketplace"
    : result.provider === "shopify"
      ? "store"
      : "html";
  const extractedUrls = result.imageUrls.length > 0
    ? result.imageUrls
    : result.imageUrl
      ? [result.imageUrl]
      : [];
  const images = mergeAutofillProductImages({
    current: formState.images,
    urls: extractedUrls,
    source,
    removedUrls: formState.removedImageUrls,
  });
  const primaryImage = getPrimaryProductImage(images);

  return {
    ...formState,
    title: result.title ?? formState.title,
    note: result.description ?? formState.note,
    imageUrl: primaryImage?.url ?? result.imageUrl ?? formState.imageUrl,
    imageUrlsText: images.length > 0 ? images.map((image) => image.url).join("\n") : formState.imageUrlsText,
    images,
    currentPrice: result.currentPriceInCents != null ? formatPriceInput(result.currentPriceInCents, result.currency) : formState.currentPrice,
    originalPrice: result.originalPriceInCents != null ? formatPriceInput(result.originalPriceInCents, result.currency) : formState.originalPrice,
    cashPrice: result.pricing?.cashPrice != null ? formatPriceInput(Math.round(result.pricing.cashPrice * 100), result.pricing.currency) : formState.cashPrice,
    installmentQuantity: result.pricing?.installment?.quantity != null ? String(result.pricing.installment.quantity) : formState.installmentQuantity,
    installmentAmount: result.pricing?.installment?.amount != null
      ? formatPriceInput(Math.round(result.pricing.installment.amount * 100), result.pricing.currency)
      : formState.installmentAmount,
    installmentInterestFree: result.pricing?.installment?.interestFree ?? formState.installmentInterestFree,
    currency: result.currency ?? formState.currency,
    availability: result.availability !== "unknown" ? result.availability : formState.availability,
    storeName: result.storeName ?? formState.storeName,
    marketplace: result.provider,
    canonicalUrl: result.canonicalUrl ?? formState.canonicalUrl,
    externalProductId: result.externalProductId ?? formState.externalProductId,
    externalVariantId: result.externalVariantId ?? formState.externalVariantId,
    selectedVariantText: result.selectedVariant.length > 0
      ? result.selectedVariant.map((variant) => `${variant.name}: ${variant.value}`).join("\n")
      : formState.selectedVariantText,
  };
}

function buildPricingFromForm(formState: AddWishFormState, extracted: ProductExtractionResult["pricing"] | null | undefined) {
  const cashPriceInCents = parsePriceInputToCents(formState.cashPrice);
  const installmentAmountInCents = parsePriceInputToCents(formState.installmentAmount);
  const quantity = Number(formState.installmentQuantity);
  return {
    ...extracted,
    currency: "BRL" as const,
    cashPrice: cashPriceInCents == null ? extracted?.cashPrice ?? null : cashPriceInCents / 100,
    cashPriceLabel: cashPriceInCents == null ? extracted?.cashPriceLabel ?? null : `${formState.cashPrice} à vista`,
    installment: quantity > 0 && installmentAmountInCents != null
      ? {
          quantity,
          amount: installmentAmountInCents / 100,
          total: null,
          interestFree: formState.installmentInterestFree,
          label: `${quantity}x de ${formState.installmentAmount}${formState.installmentInterestFree === true ? " sem juros" : ""}`,
        }
      : extracted?.installment ?? null,
    currentPrice: parsePriceInputToCents(formState.currentPrice) == null
      ? extracted?.currentPrice ?? null
      : Number(parsePriceInputToCents(formState.currentPrice)) / 100,
    previousPrice: parsePriceInputToCents(formState.originalPrice) == null
      ? extracted?.previousPrice ?? null
      : Number(parsePriceInputToCents(formState.originalPrice)) / 100,
    priceFrom: extracted?.priceFrom ?? null,
    priceTo: extracted?.priceTo ?? null,
    capturedAt: extracted?.capturedAt ?? new Date().toISOString(),
    source: "user" as const,
  };
}

function parseImageUrlsText(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseSelectedVariantText(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(":");
      if (separatorIndex === -1) {
        return {
          name: "Detalhe",
          value: entry,
        };
      }

      return {
        name: entry.slice(0, separatorIndex).trim() || "Detalhe",
        value: entry.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((entry) => entry.value);
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatPriceInput(amountInCents: number, currency: string | null) {
  const normalizedCurrency = currency?.trim().toUpperCase() || "BRL";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: normalizedCurrency,
  }).format(amountInCents / 100);
}

/**
 * Traduz o alerta de preço em texto para a interface: sem alerta devolve null,
 * com preço-alvo informa se já foi atingido ou quanto falta.
 */
function getPriceAlertStatus(wish: LocalWish | DbWish, alert: PriceAlert | undefined) {
  if (!alert) return null;

  const currency = getWishCurrency(wish);
  if (alert.targetAmount == null) {
    return { reached: false, label: "Acompanhando qualquer queda de preço." };
  }

  const target = alert.targetAmount;
  const current = getWishAmount(wish);

  if (current == null) {
    return { reached: false, label: `Alvo de ${formatCurrency(target, currency)} · sem preço para comparar.` };
  }

  if (current <= target) {
    return { reached: true, label: `Atingiu o alvo de ${formatCurrency(target, currency)}.` };
  }

  return {
    reached: false,
    label: `Faltam ${formatCurrency(current - target, currency)} para o alvo de ${formatCurrency(target, currency)}.`,
  };
}

/**
 * Valor monetário do desejo, já normalizado — os itens locais guardam o preço
 * como texto ("R$ 1.899") e os remotos como número.
 */
function getWishAmount(wish: LocalWish | DbWish): number | null {
  if ("price" in wish) {
    const cents = parsePriceInputToCents(wish.price);
    return cents == null ? null : cents / 100;
  }
  return wish.current_price ?? wish.estimated_price ?? null;
}

function parsePriceInputToCents(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").trim();
  if (!normalized) return null;

  let withDotDecimal: string;
  if (normalized.includes(",")) {
    // Formato pt-BR: ponto é separador de milhar e vírgula é decimal ("2.340,50").
    withDotDecimal = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/\.\d{3}(?:\D|$)/.test(normalized)) {
    // Só pontos com grupos de 3 dígitos ("2.340") também são milhar, não decimal.
    withDotDecimal = normalized.replace(/\./g, "");
  } else {
    withDotDecimal = normalized;
  }

  const numeric = Number(withDotDecimal);
  if (Number.isNaN(numeric)) return null;
  return Math.round(numeric * 100);
}

function readLocalState<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readPublicShareId() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("share");
}

function buildPublicShareUrl(shareId: string) {
  if (typeof window === "undefined") return `/?share=${shareId}`;
  const url = new URL(window.location.origin);
  url.searchParams.set("share", shareId);
  return url.toString();
}

function getRemoteProfile(user: SupabaseUser): LocalProfile {
  const metadata = user.user_metadata ?? {};
  const fallbackName = typeof metadata.full_name === "string" && metadata.full_name.trim() ? metadata.full_name : user.email?.split("@")[0] || "Minha conta";
  const avatarUrl = typeof metadata.avatar_url === "string" && metadata.avatar_url.trim() ? metadata.avatar_url : null;
  const privacy: LocalProfile["privacy"] = typeof metadata.privacy === "object" && metadata.privacy
    ? {
        profileVisibility: metadata.privacy.profile_visibility === "public" ? "public" : "private",
        defaultListVisibility: metadata.privacy.default_list_visibility === "private" ? "private" : "public",
      }
    : localProfileSeed.privacy;
  const deletionRequestedAt = typeof metadata.deletion_requested_at === "string" ? metadata.deletion_requested_at : null;

  return {
    fullName: fallbackName,
    email: user.email ?? "",
    avatarUrl,
    privacy,
    deletionRequestedAt,
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Preview indisponível"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Leitura da imagem falhou"));
    reader.readAsDataURL(file);
  });
}

function getNextId(items: Array<{ id: number }>) {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
}

function mapPriorityToDb(priority: Priority): DbWish["priority"] {
  if (priority === "Alta") return "must_have";
  if (priority === "Media") return "nice_to_have";
  return "surprise_me";
}

function buildLocalPublicWishlist(shareId: string, wishes: LocalWish[], title = localListName): PublicWishlist | null {
  if (shareId !== localListId) return null;

  return {
    id: localListId,
    share_id: localListId,
    title,
    occasion: "Casa nova",
    event_date: null,
    message: "Uma seleção de desejos para montar a casa nova com calma.",
    cover_image_url: images.home,
    locale: "pt-BR",
    gifts: wishes.map((wish) => ({
      id: String(wish.id),
      wishlist_id: localListId,
      name: wish.title,
      description: wish.status ?? null,
      store_url: wish.originalUrl,
      image_url: wish.image,
      estimated_price: parsePriceValue(wish.price),
      currency: "BRL",
      priority: mapPriorityToDb(wish.priority ?? "Baixa"),
      status: wish.status === "Comprado" ? "purchased" : wish.status === "Reservado" ? "reserved" : "available",
      created_at: new Date().toISOString(),
      affiliate_link:
        wish.affiliateStatus === "generated" && wish.affiliateUrl
          ? {
              original_url: wish.originalUrl,
              affiliate_url: wish.affiliateUrl,
              status: "generated",
            }
          : null,
    })),
  };
}

function parsePriceValue(price: string) {
  const normalized = price.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function currentListTitle(remote: ViewerState, isRemoteMode: boolean, localTitle: string) {
  if (!isRemoteMode) return localTitle;
  return remote.wishlists.find((wishlist) => wishlist.id === remote.selectedWishlistId)?.title ?? "Sua lista";
}

/**
 * Extrai a URL do produto do que outro app compartilhou.
 *
 * Apps de loja variam: alguns mandam a URL em `url`, outros embutem no `text`
 * junto com o nome do produto. Aceitamos os dois formatos.
 */
function extractSharedProductUrl(shared: { url?: string | null; text?: string | null; title?: string | null }) {
  const candidates = [shared.url, shared.text, shared.title];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = candidate.match(/https?:\/\/[^\s]+/i);
    if (match) return match[0];
  }

  return null;
}

function slugifyTemplateTitle(title: string) {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || `modelo-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Imagem crua do desejo, sem o placeholder que `getWishImage` devolve.
 * O checklist precisa saber que não há foto, não receber uma foto falsa.
 */
function getWishImageUrlRaw(wish: LocalWish | DbWish) {
  const raw = "image" in wish
    ? wish.image
    : getPrimaryProductImage(wish.images ?? [])?.url ?? wish.image_url;
  const value = typeof raw === "string" ? raw.trim() : "";
  return value && value !== PRODUCT_PLACEHOLDER_DATA_URL ? value : "";
}

function toCentsOrNull(amount: number | null) {
  return amount == null ? null : Math.round(amount * 100);
}

/** Desejo que ainda não tem foto ou preço. */
function isWishIncomplete(wish: LocalWish | DbWish) {
  return (
    getMissingWishFields({
      imageUrl: getWishImageUrlRaw(wish),
      priceInCents: toCentsOrNull(getWishAmount(wish)),
    }).length > 0
  );
}

function formatWishCount(total: number) {
  return total === 1 ? "1 desejo" : `${total} desejos`;
}

function currentListCover(remote: ViewerState, fallback: string) {
  const selected = remote.wishlists.find((wishlist) => wishlist.id === remote.selectedWishlistId);
  if (!selected) return fallback;
  return resolveListCover(selected.cover_image_url, selected.title);
}

function getWishId(wish: LocalWish | DbWish) {
  return typeof wish.id === "number" ? String(wish.id) : wish.id;
}

function getWishTitle(wish: LocalWish | DbWish) {
  return "title" in wish ? wish.title : wish.name;
}

function getWishStore(wish: LocalWish | DbWish) {
  if ("store" in wish) return wish.store;
  if (wish.store_name?.trim()) {
    return wish.provider ? `${wish.store_name} · ${formatProviderLabel(wish.provider)}` : wish.store_name;
  }
  if (wish.provider) {
    return formatProviderLabel(wish.provider);
  }
  return getHostnameLabel(wish.canonical_url || wish.store_url);
}

function getWishPrice(wish: LocalWish | DbWish) {
  if ("price" in wish) return wish.price;
  const amount = wish.current_price ?? wish.estimated_price;
  if (amount == null) return "Sem preço";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: getWishCurrency(wish) }).format(amount);
}

function getWishCurrency(wish: LocalWish | DbWish) {
  return "currency" in wish ? wish.currency || "BRL" : "BRL";
}

function getWishProvider(wish: LocalWish | DbWish) {
  if ("source" in wish && wish.source) {
    return wish.source;
  }
  if ("provider" in wish) {
    return wish.provider ?? null;
  }
  return null;
}

function getWishImage(wish: LocalWish | DbWish) {
  if ("image" in wish) return wish.image || PRODUCT_PLACEHOLDER_DATA_URL;
  const primaryImage = getPrimaryProductImage(wish.images ?? []);
  if (primaryImage) return primaryImage.thumbnailUrl || primaryImage.url;
  return getProductImageSrc(wish.image_url, wish.image_urls) || PRODUCT_PLACEHOLDER_DATA_URL;
}

function getWishStatus(wish: LocalWish | DbWish) {
  if ("status" in wish && typeof wish.id === "number") return wish.status;
  if (wish.status === "purchased") return "Comprado";
  return wish.status === "reserved" ? "Reservado" : undefined;
}

function getWishDrop(wish: LocalWish | DbWish) {
  if (!isLocalWish(wish) && wish.current_price != null && wish.original_price != null && wish.original_price > wish.current_price) {
    const delta = ((wish.current_price - wish.original_price) / wish.original_price) * 100;
    return `${Math.round(delta)}%`;
  }
  return "drop" in wish ? wish.drop : undefined;
}

function getWishDiscountPercent(wish: LocalWish | DbWish) {
  if (!isLocalWish(wish) && wish.current_price != null && wish.original_price != null && wish.original_price > 0) {
    return ((wish.current_price - wish.original_price) / wish.original_price) * 100;
  }
  if ("drop" in wish && wish.drop) {
    const parsed = Number(wish.drop.replace(/[^\d-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getWishSavingsAmount(wish: LocalWish | DbWish) {
  if (!isLocalWish(wish) && wish.current_price != null && wish.original_price != null && wish.original_price > wish.current_price) {
    return wish.original_price - wish.current_price;
  }
  return 0;
}

function getWishPriorityLabel(wish: LocalWish | DbWish) {
  if (isLocalWish(wish)) return wish.priority;
  if (wish.priority === "must_have") return "Alta";
  if (wish.priority === "nice_to_have") return "Media";
  return "Baixa";
}

function getWishPurchaseUrl(wish: LocalWish | DbWish) {
  if (!isLocalWish(wish)) {
    if (wish.affiliate_link?.status === "generated") return wish.affiliate_link.affiliate_url;
    return wish.canonical_url || wish.store_url || "#";
  } else {
    if (wish.affiliateStatus === "generated" && wish.affiliateUrl) return wish.affiliateUrl;
    return wish.originalUrl;
  }
}

function getWishEditableUrl(wish: LocalWish | DbWish) {
  if (isLocalWish(wish)) return wish.originalUrl;
  return wish.canonical_url || wish.store_url || "";
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function openLink(url: string) {
  if (!url || url === "#") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function getHostnameLabel(url: string | null) {
  if (!url) return "Loja externa";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Loja externa";
  }
}

function formatProviderLabel(provider: NonNullable<ProductExtractionResult["provider"]>) {
  switch (provider) {
    case "mercado_livre":
      return "Mercado Livre";
    case "structured_data":
      return "Structured Data";
    case "open_graph":
      return "Open Graph";
    case "shopify":
      return "Shopify";
    case "generic":
      return "Loja externa";
    case "manual":
      return "Manual";
    case "amazon":
      return "Amazon";
    default:
      return provider;
  }
}

function buildRadarItem(wish: LocalWish | DbWish, isTracked: boolean) {
  const savingsInCurrency = getWishSavingsAmount(wish);
  const availability = !isLocalWish(wish) ? wish.availability ?? "unknown" : "unknown";
  const autofillStatus = !isLocalWish(wish) ? wish.autofill_status ?? "not_requested" : "not_requested";
  const warningCount = !isLocalWish(wish) ? wish.extraction_warnings?.length ?? 0 : 0;
  const hasRealDrop = savingsInCurrency > 0;
  const largeDrop = getWishDiscountPercent(wish) <= -10;

  if (!isTracked) {
    return {
      wish,
      isTracked,
      state: "paused" as const,
      stateTone: "muted" as const,
      stateLabel: "Radar pausado",
      statusLabel: "Monitoramento inativo",
      supportLabel: "Ative o radar para priorizar preço, estoque e sinais de extração.",
      metricLabel: "Sem regras ativas",
      priorityScore: 0,
      savingsInCurrency: 0,
    };
  }

  if (availability === "out_of_stock") {
    return {
      wish,
      isTracked,
      state: "critical" as const,
      stateTone: "danger" as const,
      stateLabel: "Atenção imediata",
      statusLabel: "Risco de compra",
      supportLabel: "O item está sem estoque e deve ser revisado antes de compartilhar ou comprar.",
      metricLabel: "Estoque indisponível",
      priorityScore: 95,
      savingsInCurrency,
    };
  }

  if (hasRealDrop && largeDrop) {
    return {
      wish,
      isTracked,
      state: "opportunity" as const,
      stateTone: "success" as const,
      stateLabel: "Boa oportunidade",
      statusLabel: "Queda relevante",
      supportLabel: "A diferença entre preço atual e anterior já justifica destaque no radar.",
      metricLabel: `Economia de ${formatCurrency(savingsInCurrency, getWishCurrency(wish))}`,
      priorityScore: 88,
      savingsInCurrency,
    };
  }

  if (autofillStatus === "failed" || warningCount > 0 || autofillStatus === "partial") {
    return {
      wish,
      isTracked,
      state: "review" as const,
      stateTone: "warning" as const,
      stateLabel: "Revisar dados",
      statusLabel: "Dados incompletos",
      supportLabel: warningCount > 0
        ? `${warningCount} sinal(is) de extração pedem revisão manual antes de confiar no monitoramento.`
        : "O item ainda não tem dados confiáveis o suficiente para um radar completo.",
      metricLabel: !isLocalWish(wish) ? `Autofill ${getWishAutofillStatusLabel(wish)}` : "Item manual",
      priorityScore: 70,
      savingsInCurrency,
    };
  }

  if (!isLocalWish(wish) && wish.current_price == null && wish.estimated_price == null) {
    return {
      wish,
      isTracked,
      state: "review" as const,
      stateTone: "warning" as const,
      stateLabel: "Preço ausente",
      statusLabel: "Sem base de preço",
      supportLabel: "Sem preço confiável, o radar não consegue medir oportunidade real.",
      metricLabel: "Adicionar preço",
      priorityScore: 62,
      savingsInCurrency,
    };
  }

  return {
    wish,
    isTracked,
    state: "stable" as const,
    stateTone: "neutral" as const,
    stateLabel: "Monitorando",
    statusLabel: "Sinais estáveis",
    supportLabel: "Item com dados suficientes para acompanhar variação e disponibilidade.",
    metricLabel: hasRealDrop ? `Economia de ${formatCurrency(savingsInCurrency, getWishCurrency(wish))}` : "Sem queda relevante",
    priorityScore: hasRealDrop ? 58 : 42,
    savingsInCurrency,
  };
}

function getWishAvailabilityLabel(wish: DbWish) {
  switch (wish.availability) {
    case "in_stock":
      return "Em estoque";
    case "out_of_stock":
      return "Sem estoque";
    case "preorder":
      return "Pré-venda";
    default:
      return "Disponibilidade indefinida";
  }
}

function getWishAutofillStatusLabel(wish: DbWish) {
  switch (wish.autofill_status) {
    case "success":
      return "completo";
    case "partial":
      return "parcial";
    case "failed":
      return "falhou";
    case "pending":
      return "pendente";
    default:
      return "manual";
  }
}

function getAdminAutofillStatusLabel(task: AdminAffiliateQueueItem) {
  switch (task.autofill_status) {
    case "success":
      return "completo";
    case "partial":
      return "parcial";
    case "failed":
      return "falhou";
    case "pending":
      return "pendente";
    default:
      return "manual";
  }
}

function getAdminAvailabilityLabel(task: AdminAffiliateQueueItem) {
  switch (task.availability) {
    case "in_stock":
      return "Em estoque";
    case "out_of_stock":
      return "Sem estoque";
    case "preorder":
      return "Pré-venda";
    default:
      return "Indefinida";
  }
}

function formatCurrency(value: number | null | undefined, currency: string) {
  if (value == null) return "Sem preço";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

function getStoreLabel(source: LocalSource) {
  if (source === "mercado_livre") return "Mercado Livre";
  if (source === "amazon") return "Amazon";
  if (source === "shopee") return "Shopee";
  if (source === "magalu") return "Magalu";
  return "Loja externa";
}

function analyzeProductUrl(rawUrl: string) {
  const originalUrl = rawUrl.trim() || "https://exemplo.com/item";

  try {
    const parsed = new URL(originalUrl);
    const normalized = normalizeResolvedUrl(parsed);
    const source = detectMarketplace(normalized.hostname, normalized.pathname);
    return {
      originalUrl,
      resolvedUrl: normalized.toString(),
      source,
      affiliateStatus: source === "mercado_livre" ? ("not_generated" as LocalAffiliateStatus) : ("unavailable" as LocalAffiliateStatus),
    };
  } catch {
    return {
      originalUrl,
      resolvedUrl: null,
      source: "unknown" as LocalSource,
      affiliateStatus: "unavailable" as LocalAffiliateStatus,
    };
  }
}

function normalizeResolvedUrl(url: URL) {
  const normalized = new URL(url.toString());
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "tracking_id"].forEach((param) =>
    normalized.searchParams.delete(param),
  );
  normalized.hash = "";
  return normalized;
}

function detectMarketplace(hostname: string, pathname: string): LocalSource {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  const path = pathname.toLowerCase();

  if (host.includes("mercadolivre") || host.includes("mercadolibre") || host === "mlbr.co" || path.includes("/sec/")) return "mercado_livre";
  if (host.includes("amazon")) return "amazon";
  if (host.includes("shopee")) return "shopee";
  if (host.includes("magazineluiza") || host.includes("magalu")) return "magalu";
  return "unknown";
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    const supabaseError = error as { message: string; code?: string; details?: string | null; hint?: string | null };
    const normalized = `${supabaseError.code ?? ""} ${supabaseError.message}`.toLowerCase();
    const expectedAuthFailure =
      normalized.includes("invalid login credentials") ||
      normalized.includes("invalid_credentials") ||
      normalized.includes("email not confirmed") ||
      normalized.includes("email_not_confirmed") ||
      normalized.includes("too many requests") ||
      normalized.includes("rate limit") ||
      normalized.includes("over_email_send_rate_limit");
    const logPayload = {
      code: supabaseError.code ?? null,
      message: supabaseError.message,
      details: supabaseError.details ?? null,
      hint: supabaseError.hint ?? null,
    };
    if (expectedAuthFailure) console.warn("[Wishly] Auth flow rejected", logPayload);
    else console.error("[Wishly] UI error", logPayload);
    if (normalized.includes("invalid login credentials") || normalized.includes("invalid_credentials")) {
      return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
    }
    if (normalized.includes("email not confirmed") || normalized.includes("email_not_confirmed")) {
      return "Confirme seu e-mail antes de entrar. Se precisar, solicite um novo link de confirmação.";
    }
    if (normalized.includes("too many requests") || normalized.includes("rate limit") || normalized.includes("over_email_send_rate_limit")) {
      return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
    }
    if (normalized.includes("network") || normalized.includes("fetch")) {
      return "Não conseguimos conectar agora. Verifique sua internet e tente novamente.";
    }
    return "Não foi possível concluir o acesso. Tente novamente.";
  }
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Não foi possível concluir a operação.";
}

function isLocalWish(wish: LocalWish | DbWish): wish is LocalWish {
  return typeof wish.id === "number";
}

export default App;
