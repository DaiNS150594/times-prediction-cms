'use client';

import { useEffect, useRef } from 'react';

type NiceSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export default function NiceSelect(props: NiceSelectProps) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const jqueryRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const jqueryModule = await import('jquery');
      await import('jquery-nice-select');

      if (!mounted || !selectRef.current) return;

      const $ = jqueryModule.default;
      jqueryRef.current = $;

      const $select = $(selectRef.current) as any;
      if ($select.next('.nice-select').length) {
        $select.niceSelect('update');
      } else {
        $select.niceSelect();
      }
    }

    init();

    return () => {
      mounted = false;
      if (jqueryRef.current && selectRef.current) {
        const $select = jqueryRef.current(selectRef.current) as any;
        if ($select.next('.nice-select').length) {
          $select.niceSelect('destroy');
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!jqueryRef.current || !selectRef.current) return;

    const $select = jqueryRef.current(selectRef.current) as any;
    if ($select.next('.nice-select').length) {
      $select.niceSelect('update');
    }
  });

  return <select ref={selectRef} {...props} />;
}
