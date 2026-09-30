'use client';

import { useEffect, useRef } from 'react';
import type { SelectHTMLAttributes } from 'react';

type NiceSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

let pluginReady = false;
let pluginLoading: Promise<void> | null = null;

function loadNiceSelectPlugin() {
  if (pluginReady) return Promise.resolve();
  if (pluginLoading) return pluginLoading;

  pluginLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-nice-select-plugin="true"]') as HTMLScriptElement | null;

    if (existing) {
      if ((window as any).jQuery?.fn?.niceSelect) {
        pluginReady = true;
        resolve();
        return;
      }

      existing.addEventListener('load', () => {
        pluginReady = true;
        resolve();
      }, { once: true });
      existing.addEventListener('error', () => reject(new Error('Không tải được Nice Select')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = '/jquery.nice-select.js';
    script.async = true;
    script.dataset.niceSelectPlugin = 'true';

    script.onload = () => {
      if ((window as any).jQuery?.fn?.niceSelect) {
        pluginReady = true;
        resolve();
      } else {
        reject(new Error('Nice Select chưa được gắn vào jQuery'));
      }
    };
    script.onerror = () => reject(new Error('Không tải được Nice Select'));
    document.head.appendChild(script);
  });

  return pluginLoading;
}

export default function NiceSelect(props: NiceSelectProps) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const jqueryRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const jqueryModule = await import('jquery');
      if (!mounted || !selectRef.current) return;

      const $ = jqueryModule.default;
      (window as any).jQuery = $;
      (window as any).$ = $;
      jqueryRef.current = $;

      await loadNiceSelectPlugin();
      if (!mounted || !selectRef.current) return;

      const $select = $(selectRef.current) as any;
      if ($select.next('.nice-select').length) {
        $select.niceSelect('update');
      } else {
        $select.niceSelect();
      }
    }

    init().catch((error) => {
      console.error('Nice Select initialization failed:', error);
    });

    return () => {
      mounted = false;
      if (jqueryRef.current && selectRef.current) {
        const $select = jqueryRef.current(selectRef.current) as any;
        if ($select.next('.nice-select').length && $select.niceSelect) {
          $select.niceSelect('destroy');
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!jqueryRef.current || !selectRef.current) return;

    const $select = jqueryRef.current(selectRef.current) as any;
    if ($select.next('.nice-select').length && $select.niceSelect) {
      $select.niceSelect('update');
    }
  });

  return (
    <>
      <select ref={selectRef} {...props} />
    </>
  );
}
