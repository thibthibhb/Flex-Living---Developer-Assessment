import Link from "next/link";

type Property = {
  id: number;
  name: string;
  slug: string;
};

type Props = {
  properties: Property[];
  currentPath?: string;
};

export default function Navigation({ properties, currentPath = "/" }: Props) {
  const isActive = (path: string) => currentPath === path;
  
  return (
    <nav className="navigation-bar" style={{ 
      background: 'var(--surface)', 
      border: '1px solid var(--border)', 
      borderRadius: 'var(--radius)',
      marginBottom: '24px',
      boxShadow: 'var(--shadow)'
    }}>
      {/* Main Navigation */}
      <div style={{ 
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--primary)' }}>
              🏠 Flex Living Manager Portal
            </h2>
            <span className="pill" style={{ 
              background: 'var(--primary)', 
              color: 'var(--primary-contrast)', 
              fontSize: '11px',
              fontWeight: '600'
            }}>
              ENTERPRISE
            </span>
          </div>
          
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {properties.length} Properties • Enhanced Security Active
          </div>
        </div>

        {/* Primary Navigation Links */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <Link 
            href="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
            style={{
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              background: isActive('/') ? 'var(--primary)' : 'transparent',
              color: isActive('/') ? 'var(--primary-contrast)' : 'var(--text)',
              border: '1px solid',
              borderColor: isActive('/') ? 'var(--primary)' : 'var(--border)',
              transition: 'all 0.15s ease'
            }}
          >
            📊 Dashboard
          </Link>
          
          <Link 
            href="/analytics" 
            className={`nav-link ${isActive('/analytics') ? 'active' : ''}`}
            style={{
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              background: isActive('/analytics') ? 'var(--primary)' : 'transparent',
              color: isActive('/analytics') ? 'var(--primary-contrast)' : 'var(--text)',
              border: '1px solid',
              borderColor: isActive('/analytics') ? 'var(--primary)' : 'var(--border)',
              transition: 'all 0.15s ease'
            }}
          >
            📈 Analytics
          </Link>

          <div style={{ height: '20px', width: '1px', background: 'var(--border)' }} />
          
          {/* API Links */}
          <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: '600' }}>
            APIs:
          </span>
          <Link 
            href="/api/reviews/hostaway" 
            className="nav-link api-link"
            style={{
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              background: '#F8FAFC',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              transition: 'all 0.15s ease'
            }}
            target="_blank"
          >
            Hostaway
          </Link>
          <Link 
            href="/api/analytics/property-comparison" 
            className="nav-link api-link"
            style={{
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              background: '#F8FAFC',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              transition: 'all 0.15s ease'
            }}
            target="_blank"
          >
            Export
          </Link>
        </div>
      </div>

      {/* Property Navigation */}
      <div style={{ padding: '16px 24px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '12px',
          gap: '8px'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
            🏢 Property Pages:
          </span>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            View approved reviews and Google ratings
          </span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {properties.map((property, index) => (
            <Link
              key={property.id}
              href={`/properties/${property.slug}`}
              className="property-link"
              style={{
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                background: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span style={{ opacity: 0.7 }}>
                {index === 0 ? '🎨' : index === 1 ? '🚇' : index === 2 ? '🎭' : index === 3 ? '🏢' : '🎵'}
              </span>
              {property.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}