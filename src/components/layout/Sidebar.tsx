'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LayoutDashboard, Tags, Target, Wallet, CreditCard, LogOut, Settings } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/cartoes', icon: CreditCard, label: 'Cartões' },
  { href: '/categorias', icon: Tags, label: 'Categorias' },
  { href: '/metas', icon: Target, label: 'Metas' },
  { href: '/settings', icon: Settings, label: 'Configurações' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const user = session?.user;
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <>
      <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(145deg, var(--blue), var(--indigo))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 2px 8px var(--blue-light)',
            color: 'white',
          }}>
            <Wallet size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>
              Financeiro OS
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              Controle financeiro
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: '4px 0', flex: 1 }}>
        <div className="sidebar-section-label">Menu</div>
        <nav>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}>
                <item.icon size={18} />
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Footer — usuário logado */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--separator)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        {/* Avatar */}
        {user?.image ? (
          <img
            src={user.image}
            alt={user.name ?? 'Avatar'}
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--blue), var(--green))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            color: 'white',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {initials}
          </div>
        )}

        {/* Nome e email */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.name ?? 'Usuário'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email ?? 'Conta Google'}
          </div>
        </div>

        {/* Botão logout */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Sair"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            padding: 4,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s, background 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#FF3B30';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,59,48,0.08)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)';
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>

    {/* Mobile Bottom Nav */}
    <nav className="mobile-nav">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`mobile-nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
        >
          <item.icon size={24} strokeWidth={pathname.startsWith(item.href) ? 2.5 : 2} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  </>
  );
}
