'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './sidebar'
import { TopBar } from './top-bar'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  title: string
}

export function AppShell({ children, title }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 md:hidden"
            >
              <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <motion.main
        animate={{
          marginLeft: sidebarCollapsed ? 64 : 240,
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn('flex min-h-screen flex-col', 'md:ml-60')}
        style={{ marginLeft: 0 }}
      >
        <div
          className={cn(
            'hidden md:block',
            sidebarCollapsed ? 'md:ml-16' : 'md:ml-60'
          )}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            left: sidebarCollapsed ? 64 : 240,
            zIndex: 30,
          }}
        >
          <TopBar title={title} />
        </div>
        <div className="md:hidden">
          <TopBar
            title={title}
            onMenuClick={() => setMobileMenuOpen(true)}
            showMenuButton
          />
        </div>
        <div
          className={cn(
            'flex-1 p-6 pt-6 md:pt-22',
            sidebarCollapsed ? 'md:ml-16' : 'md:ml-60'
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </motion.main>
    </div>
  )
}
