import {
  ArrowDown,
  Bell,
  Check,
  ChevronLeft,
  CreditCard,
  Gift,
  Heart,
  Home,
  LineChart,
  Lock,
  Moon,
  Plus,
  Search,
  Share2,
  Sparkles,
  Sun,
  Tag,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type View = "home" | "list" | "add" | "radar" | "activity" | "pro" | "checkout" | "success";

type Wish = {
  id: number;
  title: string;
  store: string;
  price: string;
  image: string;
  status?: string;
  priority?: "Alta" | "Media" | "Baixa";
  drop?: string;
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

const wishes: Wish[] = [
  {
    id: 1,
    title: "Poltrona Boucle",
    store: "Westwing",
    price: "R$ 1.899",
    image: images.home,
    status: "Reservado",
    priority: "Alta",
    drop: "-18%",
  },
  {
    id: 2,
    title: "Mesa de centro travertino",
    store: "Tok&Stok",
    price: "R$ 2.340",
    image: images.ideaHome,
    priority: "Media",
  },
  {
    id: 3,
    title: "Luminaria de leitura",
    store: "Lumini",
    price: "R$ 690",
    image: images.setup,
    priority: "Alta",
    drop: "-9%",
  },
  {
    id: 4,
    title: "Jogo de lencois algodao",
    store: "Trousseau",
    price: "R$ 449",
    image: images.baby,
    priority: "Baixa",
  },
];

const activity = [
  "2 itens baixaram de preco na lista Casa nova.",
  "1 item voltou ao estoque em Setup dos sonhos.",
  "Mariana reservou Poltrona Boucle.",
  "Voce recebeu 3 visitas na Lista de Gabriel e Ana.",
];

function App() {
  const [view, setView] = useState<View>("home");
  const [selectedPriority, setSelectedPriority] = useState("Alta");
  const [tracked, setTracked] = useState([1, 3]);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("wishly-theme") === "dark" ? "dark" : "light";
  });

  const title = useMemo(() => {
    if (view === "home") return "";
    if (view === "list") return "Casa nova";
    if (view === "add") return "Adicionar desejo";
    if (view === "radar") return "Radar de precos";
    if (view === "activity") return "Atividade";
    if (view === "pro") return "Upgrade para o Pro";
    if (view === "checkout") return "Finalizar assinatura";
    return "Assinatura confirmada";
  }, [view]);

  function go(viewName: View) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setView(viewName);
  }

  useEffect(() => {
    window.localStorage.setItem("wishly-theme", theme);
  }, [theme]);

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="topbar">
        {view === "home" ? (
          <button className="brand-lockup" type="button" onClick={() => go("home")} aria-label="Wishly Home">
            <img className="avatar" src={images.avatar} alt="Gabriel" />
            <img className="wordmark" src={images.logo} alt="Wishly" />
          </button>
        ) : (
          <button className="icon-button" type="button" onClick={() => go(view === "checkout" ? "pro" : "home")} aria-label="Voltar">
            <ChevronLeft size={24} />
          </button>
        )}
        {title && <h1 className="top-title">{title}</h1>}
        <div className="top-actions">
          <button
            className="icon-button"
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
            title={theme === "light" ? "Modo escuro" : "Modo claro"}
          >
            {theme === "light" ? <Moon size={22} /> : <Sun size={22} />}
          </button>
          <button className="icon-button primary" type="button" onClick={() => go("activity")} aria-label="Notificacoes">
            <Bell size={23} />
          </button>
        </div>
      </header>

      <main className="screen">
        {view === "home" && <HomeScreen go={go} />}
        {view === "list" && <ListScreen go={go} tracked={tracked} setTracked={setTracked} />}
        {view === "add" && (
          <AddWishScreen go={go} selectedPriority={selectedPriority} setSelectedPriority={setSelectedPriority} />
        )}
        {view === "radar" && <RadarScreen go={go} tracked={tracked} />}
        {view === "activity" && <ActivityScreen />}
        {view === "pro" && <ProScreen go={go} />}
        {view === "checkout" && <CheckoutScreen go={go} />}
        {view === "success" && <SuccessScreen go={go} />}
      </main>

      <button className="fab" type="button" onClick={() => go(view === "home" ? "list" : "add")}>
        <Plus size={19} />
        <span>{view === "home" ? "CRIAR NOVA LISTA" : "ADICIONAR DESEJO"}</span>
      </button>

      <nav className="bottom-nav" aria-label="Navegacao principal">
        <NavItem active={view === "home"} icon={<Home size={22} />} label="Home" onClick={() => go("home")} />
        <NavItem active={view === "radar"} icon={<LineChart size={22} />} label="Radar" onClick={() => go("radar")} />
        <NavItem active={view === "activity"} icon={<Bell size={22} />} label="Activity" onClick={() => go("activity")} />
        <NavItem active={view === "pro"} icon={<User size={22} />} label="Profile" onClick={() => go("pro")} />
      </nav>
    </div>
  );
}

function HomeScreen({ go }: { go: (view: View) => void }) {
  return (
    <>
      <section className="inset-section">
        <p className="label">Novidades nas suas listas</p>
        <div className="notice-card">
          <Notice icon={<ArrowDown size={18} />} text="2 itens baixaram de preco na sua lista Casa Nova." />
          <Notice icon={<Gift size={18} />} text="1 item voltou ao estoque em Setup." />
          <Notice icon={<Heart size={18} />} text="1 item foi reservado por um convidado." />
        </div>
      </section>

      <Shelf title="Suas listas" action="VER TUDO">
        <ListCard
          image={images.home}
          title="Casa nova"
          meta="18 desejos • 3 precos cairam"
          badge="3 PROMOS"
          onClick={() => go("list")}
        />
        <ListCard image={images.setup} title="Setup dos sonhos" meta="9 desejos • 2 prioritarios" badge="9 ITENS" />
        <ListCard image={images.travel} title="Proxima viagem" meta="12 desejos • Compartilhada" badge="GRUPO" />
      </Shelf>

      <section className="idea-band">
        <Shelf title="Ideias para comecar" tone="tertiary">
          <Idea image={images.ideaHome} label="Casa nova" />
          <Idea image={images.baby} label="Cha de bebe" />
          <Idea image={images.plane} label="Viagem" />
        </Shelf>
      </section>
    </>
  );
}

function ListScreen({
  go,
  tracked,
  setTracked,
}: {
  go: (view: View) => void;
  tracked: number[];
  setTracked: (ids: number[]) => void;
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
          <p className="label light">Lista de Gabriel e Ana</p>
          <h2>Casa nova</h2>
          <p>Uma colecao calma de pecas para transformar o primeiro apartamento em casa.</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => go("add")}>
              <Plus size={18} />
              Adicionar
            </button>
            <button className="secondary-button light" type="button">
              <Share2 size={18} />
              Compartilhar
            </button>
          </div>
        </div>
      </section>

      <section className="inset-section compact">
        <div className="stat-grid">
          <Stat value="18" label="desejos" />
          <Stat value="3" label="promocoes" />
          <Stat value="4" label="reservados" />
        </div>
      </section>

      <Shelf title="Destaques" action="FILTRAR">
        {wishes.map((wish) => (
          <WishCard
            key={wish.id}
            wish={wish}
            tracked={tracked.includes(wish.id)}
            onTrack={() => toggle(wish.id)}
          />
        ))}
      </Shelf>
    </>
  );
}

function AddWishScreen({
  go,
  selectedPriority,
  setSelectedPriority,
}: {
  go: (view: View) => void;
  selectedPriority: string;
  setSelectedPriority: (priority: string) => void;
}) {
  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        go("list");
      }}
    >
      <div className="upload-card">
        <Search size={24} />
        <h2>Cole um link ou descreva o desejo</h2>
        <p>Wishly organiza imagem, loja, preco e prioridade em uma ficha editorial.</p>
      </div>
      <Field label="Link do produto" placeholder="https://loja.com/produto" />
      <Field label="Nome do desejo" placeholder="Poltrona boucle creme" />
      <div>
        <p className="field-label">Prioridade</p>
        <div className="segmented">
          {["Alta", "Media", "Baixa"].map((priority) => (
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
      <Field label="Observacao" placeholder="Tamanho, cor, motivo ou alternativa" textarea />
      <button className="primary-button full" type="submit">
        <Sparkles size={18} />
        Salvar desejo
      </button>
    </form>
  );
}

function RadarScreen({ go, tracked }: { go: (view: View) => void; tracked: number[] }) {
  return (
    <>
      <section className="radar-summary">
        <p className="label">Monitoramento Pro</p>
        <h2>Economia potencial de R$ 740</h2>
        <p>O radar acompanha preco, estoque e melhor momento de compra para os itens marcados.</p>
        <button className="primary-button" type="button" onClick={() => go("pro")}>
          <Lock size={18} />
          Ver recursos Pro
        </button>
      </section>
      <section className="vertical-list">
        {wishes.map((wish) => (
          <article className="radar-row" key={wish.id}>
            <img src={wish.image} alt="" />
            <div>
              <p className="row-title">{wish.title}</p>
              <p className="row-meta">{tracked.includes(wish.id) ? "Acompanhando preco" : "Radar pausado"}</p>
              <div className="sparkline" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <strong>{wish.drop ?? "0%"}</strong>
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
      <Field label="Nome no cartao" placeholder="Gabriel Fachini" />
      <Field label="Numero do cartao" placeholder="0000 0000 0000 0000" icon={<CreditCard size={18} />} />
      <div className="field-row">
        <Field label="Validade" placeholder="MM/AA" />
        <Field label="CVV" placeholder="123" />
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
}: {
  title: string;
  action?: string;
  children: React.ReactNode;
  tone?: "tertiary";
}) {
  return (
    <section className={`shelf ${tone ?? ""}`}>
      <div className="section-heading">
        <h2>{title}</h2>
        {action && <button type="button">{action}</button>}
      </div>
      <div className="horizontal-shelf">{children}</div>
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

function WishCard({ wish, tracked, onTrack }: { wish: Wish; tracked: boolean; onTrack: () => void }) {
  return (
    <article className="wish-card">
      <img src={wish.image} alt="" />
      <div className="wish-copy">
        <div>
          <h3>{wish.title}</h3>
          <p>{wish.store}</p>
          <span>{wish.price}</span>
        </div>
        <button className={tracked ? "tracked" : ""} type="button" onClick={onTrack}>
          <Tag size={15} />
          {tracked ? "Radar ativo" : "Ativar radar"}
        </button>
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
}: {
  label: string;
  placeholder: string;
  textarea?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-wrap">
        {icon}
        {textarea ? <textarea placeholder={placeholder} rows={4} /> : <input placeholder={placeholder} />}
      </span>
    </label>
  );
}

function NavItem({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} type="button" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default App;
