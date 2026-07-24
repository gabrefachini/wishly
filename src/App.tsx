import {
  ArrowLeft,
  ArrowDown,
  ArrowRight,
  Bell,
  Clock3,
  Check,
  ChevronLeft,
  CreditCard,
  ExternalLink,
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
  QrCode,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  Tag,
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
  createGift,
  getInitialSession,
  listenToAuthChanges,
  loadAdminAffiliateQueue,
  loadAdminAccountDeletionRequests,
  extractProductFromUrl,
  processAdminAccountDeletionRequest,
  resolvePublicGiftRedirect,
  loadViewerContext,
  loadWishlistGifts,
  getMercadoLivreAuthorizationUrl,
  signInWithPassword,
  signUpWithPassword,
  signOut,
  supabaseEnabled,
  updateAdminAffiliateLink,
  updateViewerEmail,
  updateViewerPassword,
  updateViewerPreferences,
  updateViewerProfile,
  requestViewerAccountDeletion,
  type AdminAccountDeletionRequest,
  type AdminAffiliateQueueItem,
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
  getWishSubmissionReadiness,
  isAutofillResultCurrent,
  sanitizeMercadoLivrePreview,
} from "./lib/product-autofill";

type View =
  | "home"
  | "create_list"
  | "list"
  | "add"
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
  currentPrice: string;
  originalPrice: string;
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
  "2 itens baixaram de preco na lista Casa nova.",
  "1 item voltou ao estoque em Setup dos sonhos.",
  "Mariana reservou Poltrona Boucle.",
  "Voce recebeu 3 visitas na Lista de Gabriel e Ana.",
];

const localListId = "casa-nova";
const localListName = "Casa nova";
const localCreatorName = "Gabriel Fachini";
const localAdminName = "Time Wishly";
const POST_AUTH_VIEW_KEY = "wishly-post-auth-view";
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
  currentPrice: "",
  originalPrice: "",
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
  const [tracked, setTracked] = useState<number[]>(() => readLocalState("wishly-tracked", [1, 3]));
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
  const [createListForm, setCreateListForm] = useState<CreateListFormState>({ title: "" });
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
  const [authMessage, setAuthMessage] = useState("");
  const [authPanelMode, setAuthPanelMode] = useState<AuthPanelMode>("login");
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
  const showFab = !["admin", "create_list", "profile", "profile_settings", "pro", "checkout", "success"].includes(view);

  const title = useMemo(() => {
    if (view === "home") return "";
    if (view === "create_list") return "Criar lista";
    if (view === "list") return currentListTitle(remote, isRemoteMode);
    if (view === "add") return "Adicionar desejo";
    if (view === "radar") return "Radar de precos";
    if (view === "activity") return "Atividade";
    if (view === "profile") return "Profile";
    if (view === "profile_settings") return "Configuracoes da conta";
    if (view === "pro") return "Upgrade para o Pro";
    if (view === "checkout") return "Finalizar assinatura";
    if (view === "admin") return "Fila de afiliados";
    return "Assinatura confirmada";
  }, [view, remote, isRemoteMode]);

  const localPendingTasks = useMemo(
    () => localAffiliateTasks.filter((task) => task.status === "pending"),
    [localAffiliateTasks],
  );
  const currentWishes = useMemo(() => (isRemoteMode ? remote.gifts : localWishes), [isRemoteMode, remote.gifts, localWishes]);
  const pendingCount = isRemoteMode
    ? adminQueue.filter((item) => item.affiliate_status !== "generated").length
    : localPendingTasks.length;

  function go(viewName: View) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setView(viewName);
    setMarketingMenuOpen(false);
  }

  function beginCreateListFlow() {
    setAuthPanelMode("create");
    setAuthMessage("");
    setSyncError("");
    window.localStorage.setItem(POST_AUTH_VIEW_KEY, "create_list");
  }

  function beginLoginFlow() {
    setAuthPanelMode("login");
    setAuthMessage("");
    setSyncError("");
    window.localStorage.removeItem(POST_AUTH_VIEW_KEY);
  }

  function resetAuthFlow() {
    setAuthMessage("");
    setSyncError("");
    setAuthForm({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  }

  function updateAuthField<K extends keyof AuthFormState>(field: K, value: AuthFormState[K]) {
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
      setSyncError("Nao foi possivel carregar a imagem agora.");
    }
  }

  async function handleShareCurrentList() {
    const activeShareId = isRemoteMode
      ? remote.wishlists.find((wishlist) => wishlist.id === remote.selectedWishlistId)?.share_id ?? null
      : localListId;

    if (!activeShareId) {
      setSyncError("Nao foi possivel gerar o link da lista agora.");
      return;
    }

    const shareUrl = buildPublicShareUrl(activeShareId);
    const shareTitle = isRemoteMode
      ? currentListTitle(remote, isRemoteMode)
      : localListName;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Wishly · ${shareTitle}`,
          text: `Veja a lista ${shareTitle} no Wishly.`,
          url: shareUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        window.prompt("Copie o link da lista:", shareUrl);
      }

      setAuthMessage("Link da lista pronto para compartilhar.");
      setSyncError("");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setSyncError("Nao foi possivel compartilhar a lista agora.");
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
      wishlistId: remote.selectedWishlistId ?? localListId,
      requestedUrl: formState.productUrl.trim() || canonicalOrOriginalUrl,
      title,
      canonicalUrl: canonicalOrOriginalUrl,
    });

    if (!addWishSubmissionLock.current.start(submissionFingerprint)) {
      return;
    }

    if (isRemoteMode && remote.selectedWishlistId) {
      try {
        setSyncing(true);
        setSyncError("");

        await createGift({
          wishlistId: remote.selectedWishlistId,
          name: title,
          description: formState.note.trim(),
          storeUrl: canonicalOrOriginalUrl,
          priority: mapPriorityToDb(selectedPriority),
          imageUrl: formState.imageUrl.trim() || null,
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

        await refreshRemoteState(session);
        setFormState(initialAddWishFormState);
        setExtractionState({ status: "idle", message: "", provider: null, preview: null, extractedUrl: null, errorCode: null });
        setSelectedPriority("Alta");
        addWishSubmissionLock.current.finish(true);
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
      price: formState.currentPrice.trim() || "Adicionar preco",
      image: formState.imageUrl.trim() || null,
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
    setExtractionState({ status: "idle", message: "", provider: null, preview: null, extractedUrl: null, errorCode: null });
    setSelectedPriority("Alta");
    addWishSubmissionLock.current.finish(true);
    go("list");
  }

  async function handleCreateWishlist() {
    const fallbackTitle = createListForm.title.trim() || "Minha lista";

    if (isRemoteMode) {
      try {
        setSyncing(true);
        setSyncError("");
        const wishlist = await createWishlist({ title: fallbackTitle });
        const gifts = await loadWishlistGifts(wishlist.id);
        setRemote((current) => ({
          ...current,
          wishlists: [wishlist, ...current.wishlists],
          selectedWishlistId: wishlist.id,
          gifts,
        }));
        setCreateListForm({ title: "" });
        go("add");
        return;
      } catch (error) {
        setSyncError(getErrorMessage(error));
      } finally {
        setSyncing(false);
      }
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
    try {
      setAuthMessage("");
      setSyncError("");

      const email = authForm.email.trim();
      const password = authForm.password.trim();
      const fullName = authForm.fullName.trim();

      if (!email || !password) {
        throw new Error("Preencha e-mail e senha para continuar.");
      }

      if (authPanelMode === "create") {
        if (!fullName) {
          throw new Error("Preencha seu nome para criar a conta.");
        }

        if (password.length < 6) {
          throw new Error("Use uma senha com pelo menos 6 caracteres.");
        }

        if (password !== authForm.confirmPassword.trim()) {
          throw new Error("A confirmacao da senha nao confere.");
        }

        const result = await signUpWithPassword({
          email,
          password,
          fullName,
        });

        if (!result.session) {
          setAuthMessage(`Conta criada para ${email}. Confirme seu e-mail para entrar e criar sua lista.`);
        }
        return;
      }

      await signInWithPassword(email, password);
    } catch (error) {
      setSyncError(getErrorMessage(error));
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
      setAuthMessage(`Pedido de troca enviado para ${nextEmail}. Confirme o novo e-mail para concluir a alteracao.`);
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
      setSyncError("Preencha senha atual, nova senha e confirmacao.");
      return;
    }

    if (newPassword.length < 6) {
      setSyncError("Use uma nova senha com pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setSyncError("A confirmacao da nova senha nao confere.");
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

      setAuthMessage("Preferencias de privacidade atualizadas.");
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function handleRequestAccountDeletion() {
    if (privacyForm.deleteConfirmText.trim().toUpperCase() !== "EXCLUIR") {
      setSyncError("Digite EXCLUIR para confirmar a solicitacao.");
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
      setAuthMessage("Solicitacao de exclusao registrada. A conta foi marcada para remocao.");
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

  useEffect(() => {
    window.localStorage.setItem("wishly-tracked", JSON.stringify(tracked));
  }, [tracked]);

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
        setExtractionState({
          status: "error",
          message: "Não conseguimos preencher os dados. Complete o nome e confirme a inclusão manual.",
          provider: null,
          preview: null,
          extractedUrl: rawUrl,
          errorCode: isTimeout ? "timeout" : "failed",
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

    const unsubscribe = listenToAuthChanges((nextSession) => {
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
          : buildLocalPublicWishlist(publicState.shareId!, localWishes);

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
          wishlist: buildLocalPublicWishlist(publicState.shareId!, localWishes),
          loading: false,
          notFound: !buildLocalPublicWishlist(publicState.shareId!, localWishes),
        }));
        setSyncError(getErrorMessage(error));
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [publicState.shareId, session, localWishes]);

  useEffect(() => {
    if (!session || !remoteReady) return;

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
  }, [session, remoteReady, remote.wishlists.length, view]);

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

    if (!oauthStatus) return;

    if (oauthStatus === "success") {
      setAuthMessage(oauthCode === "connected" ? "Mercado Livre conectado com sucesso." : "Conexao com Mercado Livre atualizada.");
      setSyncError("");
      if (session) {
        void refreshRemoteState(session);
      }
    } else {
      setSyncError("Nao foi possivel concluir a conexao com o Mercado Livre.");
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
          authPanelMode={authPanelMode}
          marketingMenuOpen={marketingMenuOpen}
          onCreateList={beginCreateListFlow}
          onLogin={beginLoginFlow}
          onOpenListDemo={() => go("list")}
          onResetAuthFlow={resetAuthFlow}
          onSubmitAuth={() => void handleSubmitAuth()}
          onSetAuthField={updateAuthField}
          onToggleMenu={() => setMarketingMenuOpen((current) => !current)}
          syncing={syncing}
        />
      ) : (
        <>
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden-file-input"
        onChange={(event) => void handleAvatarSelected(event.target.files)}
      />
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
        {title && <h1 className="top-title">{title}</h1>}
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
            <button className="icon-button primary" type="button" onClick={() => go("activity")} aria-label="Notificacoes">
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
            syncing={syncing}
          />
        )}
        {view === "create_list" && (
          <CreateListScreen
            formState={createListForm}
            onBack={() => go("home")}
            onChange={(title) => setCreateListForm({ title })}
            onSubmit={() => void handleCreateWishlist()}
            syncing={syncing}
          />
        )}
        {view === "list" && (
          <ListScreen
            go={go}
            tracked={tracked}
            setTracked={setTracked}
            wishes={currentWishes}
            wishlistTitle={currentListTitle(remote, isRemoteMode)}
            wishlists={remote.wishlists}
            selectedWishlistId={remote.selectedWishlistId}
            isRemoteMode={isRemoteMode}
            onSelectWishlist={(wishlistId) => void handleSelectRemoteWishlist(wishlistId)}
            onBuyWish={(wish) => void handleBuyWish(wish)}
            onShare={() => void handleShareCurrentList()}
          />
        )}
        {view === "add" && (
          <AddWishScreen
            formState={formState}
            extractionState={extractionState}
            go={go}
            selectedPriority={selectedPriority}
            setFormState={setFormState}
            setSelectedPriority={setSelectedPriority}
            onSubmit={() => void handleAddWish()}
            syncing={syncing}
            isRemoteMode={isRemoteMode}
          />
        )}
        {view === "radar" && <RadarScreen go={go} tracked={tracked} wishes={currentWishes} />}
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

      {showFab && (
        <button className="fab" type="button" onClick={() => go(view === "home" ? "list" : "add")}>
          <Plus size={19} />
          <span>{view === "home" ? "CRIAR NOVA LISTA" : "ADICIONAR DESEJO"}</span>
        </button>
      )}

      <nav className="bottom-nav" aria-label="Navegacao principal">
        <NavItem active={view === "home"} icon={<Home size={22} />} label="Home" onClick={() => go("home")} />
        <NavItem active={view === "radar"} icon={<LineChart size={22} />} label="Radar" onClick={() => go("radar")} />
        <NavItem active={view === "activity"} icon={<Bell size={22} />} label="Activity" onClick={() => go("activity")} />
        <NavItem active={view === "profile" || view === "profile_settings" || view === "pro" || view === "checkout"} icon={<User size={22} />} label="Profile" onClick={() => go("profile")} />
      </nav>
        </>
      )}
    </div>
  );
}

function MarketingHomePage({
  authForm,
  authMessage,
  authPanelMode,
  marketingMenuOpen,
  onCreateList,
  onLogin,
  onOpenListDemo,
  onResetAuthFlow,
  onSetAuthField,
  onSubmitAuth,
  onToggleMenu,
  syncing,
}: {
  authForm: AuthFormState;
  authMessage: string;
  authPanelMode: AuthPanelMode;
  marketingMenuOpen: boolean;
  onCreateList: () => void;
  onLogin: () => void;
  onOpenListDemo: () => void;
  onResetAuthFlow: () => void;
  onSetAuthField: <K extends keyof AuthFormState>(field: K, value: AuthFormState[K]) => void;
  onSubmitAuth: () => void;
  onToggleMenu: () => void;
  syncing: boolean;
}) {
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const marketingImages = {
    heroCover:
      "https://media.architecturaldigest.com/photos/6879507ebb0032785eb73ee6/4%3A3/w_1600%2Cc_limit/41.%2520Hamptons%2520Modern%2520by%2520Chango%2520%26%2520Co.%2520-%2520Nursery%2520with%2520Glider%2520Detail.jpg",
    nursery:
      "https://media.architecturaldigest.com/photos/68795074980df8afc82091b5/4%3A3/w_1600%2Cc_limit/42.%2520Hamptons%2520Modern%2520by%2520Chango%2520%26%2520Co.%2520-%2520Nursery%2520with%2520Crib%2520Detail.jpg",
    wedding:
      "https://www.irishexaminer.com/cms_media/module_img/9925/4962821_9_org_AdobeStock_931604614.jpeg.jpg",
    birthday:
      "https://imgix.bustle.com/uploads/getty/2022/4/8/76ca8d7f-ee05-48b2-8357-7c5373f55654-getty-1156021435.jpg?crop=faces&dpr=2&fit=crop&h=900&w=1200",
    personal:
      "https://www.punkt.ch/cdn/shop/files/punkt-essay-cover1.webp?v=1752138119&width=1920",
    cribMobile:
      "https://www.mumzworld.com/media/catalog/product/g/f/gf-6981b-goodway-baby-bed-bell-hanging-toy-w-rattles-beige-1654780543.jpg",
    playGym:
      "https://tinystepskids.co.uk/cdn/shop/products/Jabadabadoo_wooden-Baby-Gym-grey_1800x1800.jpg?v=1620641436",
    lamp:
      "https://www.modishstore.com/cdn/shop/products/468693_1.jpg?v=1755510615&width=990",
  };

  const templateLists = [
    { title: "Chá de bebê", detail: "Comece pelo enxoval e ajuste do seu jeito.", image: marketingImages.nursery },
    { title: "Casamento", detail: "Reúna desejos para a casa e para a celebração.", image: marketingImages.wedding },
    { title: "Aniversário", detail: "Uma lista simples para compartilhar com amigos e família.", image: marketingImages.birthday },
    { title: "Minha lista de desejos", detail: "Guarde ideias, produtos e compras futuras.", image: marketingImages.personal },
  ];

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
            {authMessage ? (
              <>
                <div className="marketing-login-copy">
                  <p className="label">{authPanelMode === "create" ? "Criar conta" : "Entrar"}</p>
                  <h2>Confira seu e-mail</h2>
                  <p>{authMessage}</p>
                </div>
                <div className="marketing-login-actions">
                  <button className="secondary-button" type="button" onClick={onResetAuthFlow}>
                    Voltar para o formulario
                  </button>
                  <button
                    className="text-button auth-switch-button"
                    type="button"
                    onClick={authPanelMode === "create" ? openLoginPanel : openCreateAccountPanel}
                  >
                    {authPanelMode === "create" ? "Ja tenho conta" : "Criar conta"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="marketing-login-copy">
                  <p className="label">{authPanelMode === "create" ? "Criar conta" : "Entrar"}</p>
                  <h2>{authPanelMode === "create" ? "Crie sua conta para montar a lista" : "Entre para continuar sua lista"}</h2>
                  <p>
                    {authPanelMode === "create"
                      ? "Seu cadastro ja abre o fluxo para criar a primeira lista."
                      : "Use seu e-mail e senha para acessar suas listas e continuar de onde parou."}
                  </p>
                </div>
                <div className="marketing-login-form">
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
                    type="button"
                    onClick={onSubmitAuth}
                    disabled={!authForm.email.trim() || !authForm.password.trim() || syncing}
                  >
                    {syncing ? "Enviando..." : authPanelMode === "create" ? "Criar conta" : "Entrar"}
                  </button>
                  <button
                    className="text-button auth-switch-button"
                    type="button"
                    onClick={authPanelMode === "create" ? openLoginPanel : openCreateAccountPanel}
                  >
                    {authPanelMode === "create" ? "Ja tenho conta" : "Criar conta"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <main className="marketing-main">
        <section className="marketing-hero">
          <div className="hero-copy-block">
            <h1>Tudo o que você deseja, em um só lugar.</h1>
            <p className="hero-support">
              Crie listas, salve produtos de qualquer loja e compartilhe seus desejos com quem importa.
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
                  <span>Tudo organizado para quem cria e para quem vai presentear.</span>
                  <button className="secondary-button" type="button" onClick={handleOpenListDemo}>
                    Ver lista
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="marketing-section" id="modelos">
          <div className="section-intro">
            <h2>Comece com uma lista para o seu momento</h2>
            <p>Escolha um modelo e personalize no seu ritmo.</p>
          </div>
          <div className="marketing-list-grid">
            {templateLists.map((item) => (
              <article className="marketing-list-card" key={item.title}>
                <img src={item.image} alt={item.title} />
                <div className="marketing-list-overlay" />
                <div className="marketing-list-copy">
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                  <button className="text-button" type="button" onClick={openCreateAccountPanel}>
                    Usar este modelo
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="marketing-section marketing-steps-section" id="como-funciona">
          <div className="section-intro">
            <h2>Como funciona</h2>
            <p>Três passos para criar e compartilhar sua lista.</p>
          </div>
          <div className="marketing-steps-grid">
            {[
              { step: "1", title: "Crie uma lista", text: "Escolha um modelo ou comece do zero.", detail: "Modelo ou lista vazia" },
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
              <p>Acompanhe os produtos das suas listas e descubra o melhor momento para comprar.</p>
              <span className="price-inline-copy">Histórico de preços · Alertas personalizados · Produtos de várias lojas</span>
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
              Avisar quando baixar para R$ 179.
            </p>
          </div>
        </section>

        <section className="marketing-section marketing-share-section">
          <div className="section-intro">
            <h2>Compartilhar a lista deve ser tão simples quanto criar.</h2>
            <p>Quem recebe sua lista pode visualizar os desejos e escolher um presente sem criar uma conta.</p>
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
                <small>disponível</small>
              </article>
              <article className="marketing-item-card compact">
                <img src={marketingImages.lamp} alt="" />
                <div className="marketing-item-copy">
                  <strong>Abajur para leitura</strong>
                  <span>Reservado por Mariana</span>
                </div>
                <small>reservado</small>
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
              <div className="marketing-share-action qr">
                <div className="marketing-qr-box" aria-hidden="true">
                  <QrCode size={34} />
                </div>
                <div>
                  <strong>QR Code discreto</strong>
                  <p>Menos dúvidas. Nenhum presente repetido.</p>
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
  syncing,
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
  syncing: boolean;
}) {
  return (
    <>
      <div className="dashboard-overview">
        {supabaseEnabled && !session && (
          <section className="inset-section dashboard-auth">
            <div className="auth-card">
              <div className="auth-mode-row" role="tablist" aria-label="Fluxo de autenticacao">
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
              <div className="auth-inline">
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
                  type="button"
                  onClick={onSubmitAuth}
                  disabled={!authForm.email.trim() || !authForm.password.trim() || syncing}
                >
                  {syncing ? "Enviando..." : authPanelMode === "create" ? "Criar conta" : "Entrar"}
                </button>
                <button className="text-button auth-switch-button" type="button" onClick={authPanelMode === "create" ? onLogin : onCreateList}>
                  {authPanelMode === "create" ? "Ja tenho conta" : "Criar conta"}
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="inset-section dashboard-notices">
          <p className="label">Novidades nas suas listas</p>
          <div className="notice-card">
            <Notice icon={<ArrowDown size={18} />} text="2 itens baixaram de preco na sua lista Casa Nova." />
            <Notice icon={<Gift size={18} />} text="1 item voltou ao estoque em Setup." />
            <Notice icon={<Heart size={18} />} text="1 item foi reservado por um convidado." />
            <Notice
              icon={<ShieldCheck size={18} />}
              text={
                pendingCount > 0
                  ? `${pendingCount} link${pendingCount > 1 ? "s" : ""} aguardando tratamento de afiliado.`
                  : "Novos links manuais entram automaticamente na fila interna de afiliados."
              }
            />
          </div>
        </section>
      </div>

      <Shelf title="Suas listas" action="VER TUDO" variant="lists">
        <ListCard image={images.home} title="Casa nova" meta="18 desejos • 3 precos cairam" badge="3 PROMOS" onClick={() => go("list")} />
        <ListCard image={images.setup} title="Setup dos sonhos" meta="9 desejos • 2 prioritarios" badge="9 ITENS" />
        <ListCard image={images.travel} title="Proxima viagem" meta="12 desejos • Compartilhada" badge="GRUPO" />
      </Shelf>

      <section className="idea-band">
        <Shelf title="Ideias para comecar" tone="tertiary" variant="ideas">
          <Idea image={images.ideaHome} label="Casa nova" />
          <Idea image={images.baby} label="Cha de bebe" />
          <Idea image={images.plane} label="Viagem" />
        </Shelf>
      </section>
    </>
  );
}

function CreateListScreen({
  formState,
  onBack,
  onChange,
  onSubmit,
  syncing,
}: {
  formState: CreateListFormState;
  onBack: () => void;
  onChange: (title: string) => void;
  onSubmit: () => void;
  syncing: boolean;
}) {
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
          <h2>Crie sua primeira lista</h2>
          <p>Escolha um nome para começar. Depois você adiciona os desejos e compartilha quando quiser.</p>
        </div>

        <Field
          label="Nome da lista"
          placeholder="Chá de bebê da Ana"
          value={formState.title}
          onChange={onChange}
        />

        <div className="field-row">
          <button className="secondary-button" type="button" onClick={onBack}>
            <ArrowLeft size={18} />
            Voltar
          </button>
          <button className="primary-button full" type="submit" disabled={!formState.title.trim() || syncing}>
            {syncing ? "Criando..." : "Continuar"}
          </button>
        </div>
      </form>

      <aside className="desktop-flow-aside">
        <div className="desktop-flow-card">
          <p className="label">Primeiro passo</p>
          <h2>Sua lista nasce pronta para receber desejos</h2>
          <p>Depois de criar a lista, você pode colar links, ajustar prioridades e compartilhar quando tudo estiver organizado.</p>
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
  tracked,
  setTracked,
  wishes,
  wishlistTitle,
  wishlists,
  selectedWishlistId,
  isRemoteMode,
  onSelectWishlist,
  onBuyWish,
  onShare,
}: {
  go: (view: View) => void;
  tracked: number[];
  setTracked: (ids: number[]) => void;
  wishes: Array<LocalWish | DbWish>;
  wishlistTitle: string;
  wishlists: DbWishlist[];
  selectedWishlistId: string | null;
  isRemoteMode: boolean;
  onSelectWishlist: (wishlistId: string) => void;
  onBuyWish: (wish: LocalWish | DbWish) => void;
  onShare: () => void;
}) {
  function toggle(id: number) {
    setTracked(tracked.includes(id) ? tracked.filter((item) => item !== id) : [...tracked, id]);
  }

  return (
    <>
      <section className="hero-list">
        <img src={images.home} alt="Sala de estar moderna" />
        <div className="hero-gradient" />
        <div className="hero-copy">
          <p className="label light">Lista compartilhada</p>
          <h2>{wishlistTitle}</h2>
          <p>Uma colecao calma de pecas para transformar o primeiro apartamento em casa.</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => go("add")}>
              <Plus size={18} />
              Adicionar
            </button>
            <button className="secondary-button light" type="button" onClick={onShare}>
              <Share2 size={18} />
              Compartilhar
            </button>
          </div>
        </div>
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
              <Stat value={String(wishes.filter((wish) => getWishDrop(wish)).length)} label="promocoes" />
              <Stat value={String(wishes.filter((wish) => getWishStatus(wish) === "Reservado").length)} label="reservados" />
            </div>
          </div>
        </div>

        <div className="list-summary-card list-summary-card-accent">
          <p className="label">Lista pronta para compartilhar</p>
          <h3>Quem receber ve o que importa sem confusao.</h3>
          <p>Os desejos ficam organizados por prioridade, reservas e sinais de preco. A lista continua simples para quem envia e para quem compra.</p>
          <div className="list-summary-notes">
            <div>
              <strong>{tracked.length}</strong>
              <span>itens com radar ativo</span>
            </div>
            <div>
              <strong>{wishes.filter((wish) => getWishPriorityLabel(wish) === "Alta").length}</strong>
              <span>prioridades altas</span>
            </div>
          </div>
          <button className="secondary-button" type="button" onClick={onShare}>
              <Share2 size={18} />
              Compartilhar
            </button>
        </div>
      </section>

      <Shelf title="Destaques" action="FILTRAR" variant="wishes">
        {wishes.map((wish, index) => (
          <WishCard
            key={getWishId(wish)}
            wish={wish}
            tracked={tracked.includes(index + 1)}
            onTrack={() => toggle(index + 1)}
            onBuy={() => onBuyWish(wish)}
          />
        ))}
      </Shelf>
    </>
  );
}

function AddWishScreen({
  formState,
  extractionState,
  go,
  selectedPriority,
  setFormState,
  setSelectedPriority,
  onSubmit,
  syncing,
  isRemoteMode,
}: {
  formState: AddWishFormState;
  extractionState: ProductExtractionState;
  go: (view: View) => void;
  selectedPriority: Priority;
  setFormState: (state: AddWishFormState) => void;
  setSelectedPriority: (priority: Priority) => void;
  onSubmit: () => void;
  syncing: boolean;
  isRemoteMode: boolean;
}) {
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
        {(extractionState.preview || formState.title.trim() || formState.imageUrl.trim()) && (
          <div className="product-extraction-card">
            <img src={formState.imageUrl.trim() || PRODUCT_PLACEHOLDER_DATA_URL} alt="" />
            <div className="product-extraction-copy">
              <strong>{formState.title.trim() || "Produto sem nome"}</strong>
              <span>
                {formState.storeName.trim() || "Loja não identificada"}
                {formState.marketplace.trim() ? ` · ${formState.marketplace}` : ""}
              </span>
              <div className="product-extraction-price-row">
                <strong>{formState.currentPrice.trim() || "Preço não identificado"}</strong>
                {formState.originalPrice.trim() && <small>{formState.originalPrice}</small>}
              </div>
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
        <div className="field-row split-row">
          <Field
            label="Moeda"
            placeholder="BRL"
            value={formState.currency}
            onChange={(value) => setFormState({ ...formState, currency: value.toUpperCase() })}
          />
          <label className="field">
            <span className="field-label">Disponibilidade</span>
            <span className="input-wrap">
              <select
                value={formState.availability}
                onChange={(event) => setFormState({ ...formState, availability: event.target.value as AddWishFormState["availability"] })}
              >
                <option value="unknown">Desconhecida</option>
                <option value="in_stock">Em estoque</option>
                <option value="out_of_stock">Sem estoque</option>
                <option value="preorder">Pré-venda</option>
              </select>
            </span>
          </label>
        </div>
        <Field
          label="Imagem principal"
          placeholder="https://..."
          value={formState.imageUrl}
          onChange={(value) => setFormState({ ...formState, imageUrl: value })}
        />
        <Field
          label="Imagens adicionais"
          placeholder={"Uma URL por linha"}
          textarea
          value={formState.imageUrlsText}
          onChange={(value) => setFormState({ ...formState, imageUrlsText: value })}
        />
        <div className="field-row split-row">
          <Field
            label="Produto externo"
            placeholder="MLB123456"
            value={formState.externalProductId}
            onChange={(value) => setFormState({ ...formState, externalProductId: value })}
          />
          <Field
            label="Variante externa"
            placeholder="987654321"
            value={formState.externalVariantId}
            onChange={(value) => setFormState({ ...formState, externalVariantId: value })}
          />
        </div>
        <Field
          label="Variação selecionada"
          placeholder={"Cor: Preta\nVoltagem: 110V"}
          textarea
          value={formState.selectedVariantText}
          onChange={(value) => setFormState({ ...formState, selectedVariantText: value })}
        />
        <Field
          label="URL canônica"
          placeholder="https://..."
          value={formState.canonicalUrl}
          onChange={(value) => setFormState({ ...formState, canonicalUrl: value })}
        />
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
          <button className="secondary-button" type="button" onClick={() => go("list")}>
            Voltar
          </button>
          <button
            className="primary-button full"
            type="submit"
            disabled={!getWishSubmissionReadiness({
              title: formState.title,
              productUrl: formState.productUrl,
              extractionStatus: extractionState.status,
              extractedUrl: extractionState.extractedUrl,
              syncing,
            }).canSubmit}
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
  onCreateList,
}: {
  loading: boolean;
  wishlist: PublicWishlist | null;
  notFound: boolean;
  onBackHome: () => void;
  onBuyWish: (wish: DbWish) => void;
  onCreateList: () => void;
}) {
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
            <p>Estamos preparando a lista para voce visualizar tudo em um so lugar.</p>
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
            <p className="label">Link indisponivel</p>
            <h2>Essa lista nao esta mais acessivel.</h2>
            <p>Confira se o link foi copiado por completo ou volte para criar sua propria lista no Wishly.</p>
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
            <img src={wishlist.cover_image_url || images.home} alt="" />
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
          <div className="section-heading">
            <h2>Desejos da lista</h2>
          </div>
          <div className="public-wishes-grid">
            {wishlist.gifts.map((wish) => (
              <article className="public-wish-card" key={wish.id}>
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
                  <button className="secondary-button buy-button" type="button" onClick={() => onBuyWish(wish)}>
                    <ExternalLink size={16} />
                    Ver presente
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function RadarScreen({ go, tracked, wishes }: { go: (view: View) => void; tracked: number[]; wishes: Array<LocalWish | DbWish> }) {
  const radarItems = wishes
    .map((wish, index) => buildRadarItem(wish, tracked.includes(index + 1)))
    .sort((left, right) => right.priorityScore - left.priorityScore);
  const potentialSavings = radarItems.reduce((sum, item) => sum + item.savingsInCurrency, 0);
  const criticalCount = radarItems.filter((item) => item.state === "critical").length;
  const opportunityCount = radarItems.filter((item) => item.state === "opportunity").length;
  const reviewCount = radarItems.filter((item) => item.state === "review").length;

  return (
    <>
      <section className="radar-summary">
        <p className="label">Monitoramento Pro</p>
        <h2>Economia potencial de {formatCurrency(potentialSavings, "BRL")}</h2>
        <p>O radar prioriza queda real de preco, risco de estoque e confiabilidade dos dados do item.</p>
        <div className="stat-grid">
          <Stat value={String(opportunityCount)} label="oportunidades" />
          <Stat value={String(criticalCount)} label="criticos" />
          <Stat value={String(reviewCount)} label="revisar" />
        </div>
        <button className="primary-button" type="button" onClick={() => go("pro")}>
          <Lock size={18} />
          Ver recursos Pro
        </button>
      </section>
      <section className="vertical-list">
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
                <span className={`radar-pill radar-pill-${item.stateTone}`}>{item.stateLabel}</span>
                <span className="row-meta">{item.metricLabel}</span>
              </div>
              <p className="row-meta">{item.supportLabel}</p>
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
            <strong>Configuracoes da conta</strong>
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
            <p>Radar de preco, alertas e experiencia premium.</p>
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
              {syncing ? "Salvando..." : "Salvar alteracoes"}
            </button>
          </div>
        </article>

        <article className="profile-settings-card">
          <div>
            <p className="label">Integracoes</p>
            <h2>Mercado Livre</h2>
            <p>
              Conecte sua conta para habilitar a integracao oficial do Meli no Wishly.
            </p>
          </div>

          {isRemoteMode && meliConnection ? (
            <div className="danger-status">
              <strong>Conectado como usuario {meliConnection.meli_user_id}</strong>
              <p>
                Vinculado em {formatDateTime(meliConnection.connected_at)}
                {meliConnection.last_refreshed_at ? ` · ultimo refresh em ${formatDateTime(meliConnection.last_refreshed_at)}` : ""}
              </p>
            </div>
          ) : null}

          <div className="field-row">
            <button className="primary-button full" type="button" onClick={onConnectMercadoLivre} disabled={!isRemoteMode || meliConnecting}>
              {meliConnecting ? "Conectando..." : meliConnection ? "Reconectar Mercado Livre" : "Conectar Mercado Livre"}
            </button>
          </div>

          {!isRemoteMode ? (
            <p className="field-help">Entre na sua conta antes de iniciar a conexao.</p>
          ) : (
            <p className="field-help">O fluxo abre a autorizacao oficial do Mercado Livre e retorna para esta tela.</p>
          )}
        </article>

        <article className="profile-settings-card">
          <div>
            <p className="label">Acesso</p>
            <h2>Trocar e-mail</h2>
            <p>{isRemoteMode ? "O Supabase pode pedir confirmacao no novo e-mail para concluir a troca." : "No modo local, a mudanca fica salva apenas neste navegador."}</p>
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
            <p className="label">Seguranca</p>
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
                  Publico
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
                  Publicas
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
            <h2>Solicitar exclusao da conta</h2>
            <p>
              Essa solicitacao marca a conta para remocao. Digite <strong>EXCLUIR</strong> para confirmar.
            </p>
          </div>

          {deletionRequestedAt ? (
            <div className="danger-status">
              <strong>Solicitado em {formatDateTime(deletionRequestedAt)}</strong>
              <p>A conta ja foi marcada para exclusao e deve seguir o fluxo administrativo.</p>
            </div>
          ) : null}

          <Field
            label="Confirmacao"
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
              {syncing ? "Processando..." : "Solicitar exclusao"}
            </button>
          </div>
        </article>
      </div>

      <aside className="profile-settings-aside">
        <div className="profile-note-card">
          <p className="label">Perfil</p>
          <h3>Foto e nome ja funcionais</h3>
          <p>{isRemoteMode ? "As alteracoes sao salvas na sua conta e refletidas no app." : "No modo local, as alteracoes ficam salvas neste navegador."}</p>
        </div>
        <div className="profile-note-card">
          <p className="label">Acesso</p>
          <h3>E-mail e senha agora entram aqui</h3>
          <p>Os fluxos foram separados para reduzir erro do usuario e manter a tela objetiva.</p>
        </div>
        <div className="profile-note-card">
          <p className="label">Conta</p>
          <h3>Exclusao com trilha clara</h3>
          <p>A remocao definitiva exige backend privilegiado. Por enquanto a conta fica marcada para exclusao de forma explicita.</p>
        </div>
      </aside>
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
}) {
  if (isRemoteMode && !isAdmin) {
    return (
      <section className="admin-stack">
        <div className="empty-admin">
          <ShieldCheck size={24} />
          <strong>Acesso restrito</strong>
          <p>Essa fila real so aparece para usuarios presentes em `admin_users` no Supabase.</p>
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
      <section className="admin-stack">
        <div className="admin-summary">
          <p className="label">Operacao real</p>
          <h2>Fila unica para admins</h2>
          <p>Essa tela usa RPCs do Supabase para afiliados e exclusao de conta.</p>
          <div className="stat-grid">
            <Stat value={String(pending.length)} label="pendentes" />
            <Stat value={String(pendingDeletionRequests.length)} label="exclusoes" />
            <Stat value={String(remoteQueue.length + remoteDeletionRequests.length)} label="total" />
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="empty-admin">
            <ShieldCheck size={24} />
            <strong>Nenhuma pendencia aberta</strong>
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
            <strong>Nenhuma exclusao aguardando acao</strong>
            <p>Quando um usuario solicitar remocao da conta, o pedido aparece aqui.</p>
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
              <h2>Historico</h2>
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
    );
  }

  const pending = localTasks.filter((task) => task.status === "pending");
  const history = localTasks.filter((task) => task.status !== "pending");

  return (
    <section className="admin-stack">
      <div className="admin-summary">
        <p className="label">Operacao local</p>
        <h2>Fila demo para admins</h2>
        <p>Essa fila continua disponivel como fallback enquanto voce nao estiver autenticado no banco real.</p>
        <div className="stat-grid">
          <Stat value={String(pending.length)} label="pendentes" />
          <Stat value={String(history.filter((task) => task.status === "completed").length)} label="gerados" />
          <Stat value={String(history.length)} label="encerrados" />
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="empty-admin">
          <ShieldCheck size={24} />
          <strong>Nenhuma pendencia aberta</strong>
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
                  Marcar invalido
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
            <h2>Historico</h2>
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

function ProScreen({ go }: { go: (view: View) => void }) {
  return (
    <>
      <section className="pro-hero">
        <Sparkles size={28} />
        <h2>Wishly Pro</h2>
        <p>Radar de precos, alertas inteligentes e listas compartilhadas com uma experiencia sem anuncios.</p>
        <strong>R$ 14,90 / mes</strong>
        <button className="primary-button full" type="button" onClick={() => go("checkout")}>
          Comecar agora
        </button>
      </section>
      <section className="feature-list">
        {["Alertas de queda de preco", "Historico por loja", "Reservas privadas", "Temas editoriais premium"].map((item) => (
          <div className="feature" key={item}>
            <Check size={18} />
            <span>{item}</span>
          </div>
        ))}
      </section>
    </>
  );
}

function CheckoutScreen({ go }: { go: (view: View) => void }) {
  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        go("success");
      }}
    >
      <div className="plan-card">
        <span>Wishly Pro</span>
        <strong>R$ 14,90</strong>
        <small>Renovacao mensal. Cancele quando quiser.</small>
      </div>
      <Field label="Nome no cartao" placeholder="Gabriel Fachini" value="" onChange={() => undefined} />
      <Field label="Numero do cartao" placeholder="0000 0000 0000 0000" icon={<CreditCard size={18} />} value="" onChange={() => undefined} />
      <div className="field-row">
        <Field label="Validade" placeholder="MM/AA" value="" onChange={() => undefined} />
        <Field label="CVV" placeholder="123" value="" onChange={() => undefined} />
      </div>
      <button className="primary-button full" type="submit">
        Confirmar assinatura
      </button>
    </form>
  );
}

function SuccessScreen({ go }: { go: (view: View) => void }) {
  return (
    <section className="success-card">
      <div className="success-icon">
        <Check size={36} />
      </div>
      <h2>Assinatura confirmada</h2>
      <p>O Radar Pro ja esta ativo nas suas listas. Voce recebera alertas quando o melhor momento de compra chegar.</p>
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
  tracked,
  onTrack,
  onBuy,
}: {
  wish: LocalWish | DbWish;
  tracked: boolean;
  onTrack: () => void;
  onBuy: () => void;
}) {
  return (
    <article className="wish-card">
      <img src={getWishImage(wish)} alt="" />
      <div className="wish-copy">
        <div>
          <h3>{getWishTitle(wish)}</h3>
          <p>{getWishStore(wish)}</p>
          <span>{getWishPrice(wish)}</span>
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
        </div>
      </div>
    </article>
  );
}

function Idea({ image, label }: { image: string; label: string }) {
  return (
    <button className="idea" type="button">
      <span>
        <img src={image} alt="" />
      </span>
      <strong>{label}</strong>
    </button>
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
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-wrap">
        {icon}
        {textarea ? (
          <textarea placeholder={placeholder} rows={4} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
        ) : (
          <input
            type={inputType ?? "text"}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            autoComplete={autoComplete}
          />
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

function mergeExtractedProductIntoForm(formState: AddWishFormState, result: ProductExtractionResult): AddWishFormState {
  return {
    ...formState,
    title: result.title ?? formState.title,
    note: result.description ?? formState.note,
    imageUrl: result.imageUrl ?? formState.imageUrl,
    imageUrlsText: result.imageUrls.length > 0 ? result.imageUrls.join("\n") : formState.imageUrlsText,
    currentPrice: result.currentPriceInCents != null ? formatPriceInput(result.currentPriceInCents, result.currency) : formState.currentPrice,
    originalPrice: result.originalPriceInCents != null ? formatPriceInput(result.originalPriceInCents, result.currency) : formState.originalPrice,
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

function parsePriceInputToCents(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").trim();
  if (!normalized) return null;
  const withDotDecimal = normalized.includes(",")
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized;
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
      reject(new Error("Preview indisponivel"));
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

function buildLocalPublicWishlist(shareId: string, wishes: LocalWish[]): PublicWishlist | null {
  if (shareId !== localListId) return null;

  return {
    id: localListId,
    share_id: localListId,
    title: localListName,
    occasion: "Casa nova",
    event_date: null,
    message: "Uma selecao de desejos para montar a casa nova com calma.",
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
      status: wish.status === "Reservado" ? "reserved" : "available",
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

function currentListTitle(remote: ViewerState, isRemoteMode: boolean) {
  if (!isRemoteMode) return localListName;
  return remote.wishlists.find((wishlist) => wishlist.id === remote.selectedWishlistId)?.title ?? "Sua lista";
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
  if (amount == null) return "Sem preco";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: getWishCurrency(wish) }).format(amount);
}

function getWishCurrency(wish: LocalWish | DbWish) {
  return "currency" in wish ? wish.currency || "BRL" : "BRL";
}

function getWishImage(wish: LocalWish | DbWish) {
  if ("image" in wish) return wish.image || PRODUCT_PLACEHOLDER_DATA_URL;
  return getProductImageSrc(wish.image_url, wish.image_urls) || PRODUCT_PLACEHOLDER_DATA_URL;
}

function getWishStatus(wish: LocalWish | DbWish) {
  if ("status" in wish && typeof wish.id === "number") return wish.status;
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
  if ("priority" in wish && typeof wish.id === "number") return wish.priority;
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
      supportLabel: "Ative o radar para priorizar preco, estoque e sinais de extração.",
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
      stateLabel: "Atencao imediata",
      statusLabel: "Risco de compra",
      supportLabel: "O item está sem estoque e deve ser revisado antes de compartilhar ou comprar.",
      metricLabel: "Estoque indisponivel",
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
      supportLabel: "A diferenca entre preco atual e anterior ja justifica destaque no radar.",
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
      stateLabel: "Preco ausente",
      statusLabel: "Sem base de preco",
      supportLabel: "Sem preco confiável, o radar não consegue medir oportunidade real.",
      metricLabel: "Adicionar preco",
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
    statusLabel: "Sinais estaveis",
    supportLabel: "Item com dados suficientes para acompanhar variacao e disponibilidade.",
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
      return "Pre-venda";
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
      return "Pre-venda";
    default:
      return "Indefinida";
  }
}

function formatCurrency(value: number | null | undefined, currency: string) {
  if (value == null) return "Sem preco";
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
    console.error("[Wishly] UI error", {
      code: supabaseError.code ?? null,
      message: supabaseError.message,
      details: supabaseError.details ?? null,
      hint: supabaseError.hint ?? null,
    });
    return supabaseError.message;
  }
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Nao foi possivel concluir a operacao.";
}

function isLocalWish(wish: LocalWish | DbWish): wish is LocalWish {
  return typeof wish.id === "number";
}

export default App;
