import React, { useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useHistory, useLocation } from '@docusaurus/router';
import { useBaseUrlUtils } from '@docusaurus/useBaseUrl';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import { isRegexpStringMatch } from '@docusaurus/theme-common';
import { useSearchPage } from '@docusaurus/theme-common/internal';
import { DocSearchButton, useDocSearchKeyboardEvents } from '@docsearch/react';
import { useAlgoliaContextualFacetFilters } from '@docusaurus/theme-search-algolia/client';
import Translate from '@docusaurus/Translate';
import translations from '@theme/SearchTranslations';
let DocSearchModal = null;
function Hit({ hit, children }) {
  const text = hit.content || hit.hierarchy[hit.type];
  const scrollTo = `-scroll-to-${text}`;

  return <Link to={hit.url + scrollTo}>{children}</Link>;
}
function ResultsFooter({ state, onClose }) {
  const { generateSearchPageLink } = useSearchPage();
  return (
    <Link
      to={generateSearchPageLink(state.query)}
      onClick={onClose}
    >
      <Translate
        id='theme.SearchBar.seeAll'
        values={{ count: state.context.nbHits }}
      >
        {'See all {count} results'}
      </Translate>
    </Link>
  );
}
function Footer({ productName, setProductName }) {
  const products = ['calico', 'calico-cloud', 'calico-enterprise']
    .filter((product) => product !== productName)
    .map((product) => <a onClick={() => setProductName(product)}>{getFullProductName(product)}</a>);

  return (
    <div className='search-results-footer'>
      See results for {products[0]} or {products[1]}
    </div>
  );
}
function mergeFacetFilters(f1, f2) {
  const normalize = (f) => (typeof f === 'string' ? [f] : f);
  return [...normalize(f1), ...normalize(f2)];
}
function useProductName() {
  const { pathname } = useLocation();

  if (pathname.startsWith('/calico/')) {
    return 'calico';
  } else if (pathname.startsWith('/calico-cloud/')) {
    return 'calico-cloud';
  } else if (pathname.startsWith('/calico-enterprise/')) {
    return 'calico-enterprise';
  }
}
function getFullProductName(product) {
  switch (product) {
    case 'calico':
      return 'Calico Open Source';
    case 'calico-cloud':
      return 'Calico Cloud';
    case 'calico-enterprise':
      return 'Calico Enterprise';
  }
}
function filterFacetFiltersByProduct(filters, product) {
  const [language, products] = filters;

  return [
    language,
    products.filter((p) => {
      const match = p.match(/(.*)-/);
      return match && match[1].endsWith(product);
    }),
  ];
}
function DocSearch({ contextualSearch, externalUrlRegex, ...props }) {
  const { siteMetadata } = useDocusaurusContext();
  const contextualSearchFacetFilters = useAlgoliaContextualFacetFilters();
  const configFacetFilters = props.searchParameters?.facetFilters ?? [];
  const facetFilters = contextualSearch
    ? // Merge contextual search filters with config filters
      mergeFacetFilters(contextualSearchFacetFilters, configFacetFilters)
    : // ... or use config facetFilters
      configFacetFilters;
  const [productName, setProductName] = useState(useProductName());
  // We let user override default searchParameters if she wants to
  const [searchParameters, setSearchParameters] = useState({});
  React.useEffect(() => {
    setSearchParameters({
      ...props.searchParameters,
      facetFilters: filterFacetFiltersByProduct(facetFilters, productName),
    });
  }, [productName]);
  const [footer, setFooter] = useState();
  const { withBaseUrl } = useBaseUrlUtils();
  const history = useHistory();
  const searchContainer = useRef(null);
  const searchButtonRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState(undefined);
  const importDocSearchModalIfNeeded = useCallback(() => {
    if (DocSearchModal) {
      return Promise.resolve();
    }
    return Promise.all([
      import('@docsearch/react/modal'),
      import('@docsearch/react/style'),
      import('./styles.css'),
    ]).then(([{ DocSearchModal: Modal }]) => {
      DocSearchModal = Modal;
    });
  }, []);
  const onOpen = useCallback(() => {
    importDocSearchModalIfNeeded().then(() => {
      searchContainer.current = document.createElement('div');
      document.body.insertBefore(searchContainer.current, document.body.firstChild);
      setIsOpen(true);
      setTimeout(() => {
        setFooter(document.querySelector('.DocSearch-Footer'));
      });
    });
  }, [importDocSearchModalIfNeeded, setIsOpen]);
  const onClose = useCallback(() => {
    setIsOpen(false);
    searchContainer.current?.remove();
    setInitialQuery('');
  }, [setIsOpen]);
  const onInput = useCallback(
    (event) => {
      importDocSearchModalIfNeeded().then(() => {
        setIsOpen(true);
        setInitialQuery(event.key);
      });
    },
    [importDocSearchModalIfNeeded, setIsOpen, setInitialQuery]
  );
  const navigator = useRef({
    navigate({ itemUrl }) {
      // Algolia results could contain URL's from other domains which cannot
      // be served through history and should navigate with window.location
      if (isRegexpStringMatch(externalUrlRegex, itemUrl)) {
        window.location.href = itemUrl;
      } else {
        history.push(itemUrl);
      }
    },
  }).current;
  const transformItems = useRef((items) =>
    items.map((item) => {
      // If Algolia contains a external domain, we should navigate without
      // relative URL
      if (isRegexpStringMatch(externalUrlRegex, item.url)) {
        return item;
      }
      // We transform the absolute URL into a relative URL.
      const url = new URL(item.url);
      return {
        ...item,
        url: withBaseUrl(`${url.pathname}${url.hash}`),
      };
    })
  ).current;
  const resultsFooterComponent = useMemo(
    () =>
      // eslint-disable-next-line react/no-unstable-nested-components
      (footerProps) =>
        (
          <ResultsFooter
            {...footerProps}
            onClose={onClose}
          />
        ),
    [onClose]
  );
  const transformSearchClient = useCallback(
    (searchClient) => {
      searchClient.addAlgoliaAgent('docusaurus', siteMetadata.docusaurusVersion);
      return searchClient;
    },
    [siteMetadata.docusaurusVersion]
  );
  useDocSearchKeyboardEvents({
    isOpen,
    onOpen,
    onClose,
    onInput,
    searchButtonRef,
  });

  return (
    <>
      <Head>
        {/* This hints the browser that the website will load data from Algolia,
        and allows it to preconnect to the DocSearch cluster. It makes the first
        query faster, especially on mobile. */}
        <link
          rel='preconnect'
          href={`https://${props.appId}-dsn.algolia.net`}
          crossOrigin='anonymous'
        />
      </Head>

      <DocSearchButton
        onTouchStart={importDocSearchModalIfNeeded}
        onFocus={importDocSearchModalIfNeeded}
        onMouseOver={importDocSearchModalIfNeeded}
        onClick={onOpen}
        ref={searchButtonRef}
        translations={translations.button}
      />

      {footer &&
        createPortal(
          <Footer
            productName={productName}
            setProductName={(product) => {
              setFooter(null);
              const query = document.querySelector('#docsearch-input').value;
              setIsOpen(false);

              setInitialQuery(query);
              setProductName(product);
              setTimeout(() => {
                setIsOpen(true);
                setTimeout(() => setFooter(document.querySelector('.DocSearch-Footer')));
              });
            }}
          />,
          footer
        )}
      {isOpen &&
        DocSearchModal &&
        searchContainer.current &&
        createPortal(
          <DocSearchModal
            onClose={onClose}
            initialScrollY={window.scrollY}
            initialQuery={initialQuery}
            navigator={navigator}
            transformItems={transformItems}
            hitComponent={Hit}
            transformSearchClient={transformSearchClient}
            {...(props.searchPagePath && {
              resultsFooterComponent,
            })}
            {...props}
            searchParameters={searchParameters}
            placeholder={`Search docs (${getFullProductName(productName)})`}
            translations={translations.modal}
          />,
          searchContainer.current
        )}
    </>
  );
}
export default function SearchBar() {
  const { siteConfig } = useDocusaurusContext();
  return <DocSearch {...siteConfig.themeConfig.algolia} />;
}
