"use client";

import { useState } from "react";
import Link from "next/link";

type Property = {
  id: number;
  name: string;
  slug: string;
  approvedCount?: number;
};

type Props = {
  properties: Property[];
  currentPath?: string;
  maxVisible?: number;
};

export default function Navigation({ properties, currentPath = "/", maxVisible = 5 }: Props) {
  const [showAllProperties, setShowAllProperties] = useState(false);
  const isActive = (path: string) => currentPath === path;
  
  const visibleProperties = showAllProperties ? properties : properties.slice(0, maxVisible);
  const hasMoreProperties = properties.length > maxVisible;
  
  const emojis = ['🎨', '🚇', '🎭', '🏢', '🎵', '🏠', '🌟', '✨', '🔥', '⭐'];
  
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
          {visibleProperties.map((property, index) => (
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
                {emojis[index % emojis.length]}
              </span>
              <span>{property.name}</span>
              {(property.approvedCount ?? 0) > 0 && (
                <span style={{
                  background: 'var(--primary)',
                  color: 'var(--primary-contrast)',
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  minWidth: '16px',
                  textAlign: 'center'
                }}>
                  {property.approvedCount}
                </span>
              )}
            </Link>
          ))}
          
          {hasMoreProperties && (
            <button
              onClick={() => setShowAllProperties(!showAllProperties)}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--primary)';
                e.currentTarget.style.color = 'var(--primary-contrast)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'var(--primary)';
              }}
            >
              {showAllProperties ? 'Show less' : `+${properties.length - maxVisible} more`}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}