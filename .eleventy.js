/*
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const pluginRss = require('@11ty/eleventy-plugin-rss');
const pluginSyntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');

const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const markdownItAttrs = require('markdown-it-attrs');
const slugify = require('slugify');

const componentsDir = 'src/site/_includes/components';
const ArticleNavigation = require(`./${componentsDir}/ArticleNavigation`);
const Aside = require(`./${componentsDir}/Aside`);
const Assessment = require(`./${componentsDir}/Assessment`);
const Author = require(`./${componentsDir}/Author`);
const AuthorCard = require(`./${componentsDir}/AuthorCard`);
const AuthorInfo = require(`./${componentsDir}/AuthorInfo`);
const Banner = require(`./${componentsDir}/Banner`);
const Blockquote = require(`./${componentsDir}/Blockquote`);
const Breadcrumbs = require(`./${componentsDir}/Breadcrumbs`);
const CodelabsCallout = require(`./${componentsDir}/CodelabsCallout`);
const Compare = require(`./${componentsDir}/Compare`);
const CompareCaption = require(`./${componentsDir}/CompareCaption`);
const Details = require(`./${componentsDir}/Details`);
const DetailsSummary = require(`./${componentsDir}/DetailsSummary`);
const EventTable = require(`./${componentsDir}/EventTable`);
const Hero = require(`./${componentsDir}/Hero`);
const Instruction = require(`./${componentsDir}/Instruction`);
const Label = require(`./${componentsDir}/Label`);
const Meta = require(`./${componentsDir}/Meta`);
const PathCard = require(`./${componentsDir}/PathCard`);
const PostCard = require(`./${componentsDir}/PostCard`);
const SignPosts = require(`./${componentsDir}/SignPosts`);
const Tooltip = require(`./${componentsDir}/Tooltip`);
const YouTube = require(`./${componentsDir}/YouTube`);

const collectionsDir = 'src/site/_collections';
const authors = require(`./${collectionsDir}/authors`);
const blogPostsDescending = require(`./${collectionsDir}/blog-posts-descending`);
const newsletters = require(`./${collectionsDir}/newsletters`);
const postToCollections = require(`./${collectionsDir}/post-to-collections`);
const postsWithLighthouse = require(`./${collectionsDir}/posts-with-lighthouse`);
const recentBlogPosts = require(`./${collectionsDir}/recent-blog-posts`);
const tags = require(`./${collectionsDir}/tags`);
// nb. algoliaPosts is only require'd if needed, below

const filtersDir = 'src/site/_filters';
const consoleDump = require(`./${filtersDir}/console-dump`);
const {memoize, findByUrl} = require(`./${filtersDir}/find-by-url`);
const pathSlug = require(`./${filtersDir}/path-slug`);
const containsTag = require(`./${filtersDir}/contains-tag`);
const expandContributors = require(`./${filtersDir}/expand-contributors`);
const findTags = require(`./${filtersDir}/find-tags`);
const githubLink = require(`./${filtersDir}/github-link`);
const gitlocalizeLink = require(`./${filtersDir}/gitlocalize-link`);
const htmlDateString = require(`./${filtersDir}/html-date-string`);
const md = require(`./${filtersDir}/md`);
const pagedNavigation = require(`./${filtersDir}/paged-navigation`);
const postsLighthouseJson = require(`./${filtersDir}/posts-lighthouse-json`);
const prettyDate = require(`./${filtersDir}/pretty-date`);
const removeDrafts = require(`./${filtersDir}/remove-drafts`);
const strip = require(`./${filtersDir}/strip`);
const stripBlog = require(`./${filtersDir}/strip-blog`);
const stripLanguage = require(`./${filtersDir}/strip-language`);

const transformsDir = 'src/site/_transforms';
const disableLazyLoad = require(`./${transformsDir}/disable-lazy-load`);
const {responsiveImages} = require(`./${transformsDir}/responsive-images`);
const {
  serviceWorkerPartials,
} = require(`./${transformsDir}/service-worker-partials`);

module.exports = function(config) {
  // ----------------------------------------------------------------------------
  // PLUGINS
  // ----------------------------------------------------------------------------
  // Syntax highlighting for code snippets
  config.addPlugin(pluginSyntaxHighlight);
  // RSS feeds
  config.addPlugin(pluginRss);

  // ----------------------------------------------------------------------------
  // MARKDOWN
  // ----------------------------------------------------------------------------
  const markdownItOptions = {
    html: true,
  };
  const markdownItAnchorOptions = {
    level: 2,
    permalink: true,
    permalinkClass: 'w-headline-link',
    permalinkSymbol: '#',
    slugify: function(str) {
      return slugify(str, {
        replacement: '-',
        lower: true,
      });
    },
  };
  const markdownItAttrsOpts = {
    leftDelimiter: '{:',
    rightDelimiter: '}',
    allowedAttributes: ['id', 'class', /^data\-.*$/],
  };

  const mdLib = markdownIt(markdownItOptions)
    .use(markdownItAnchor, markdownItAnchorOptions)
    .use(markdownItAttrs, markdownItAttrsOpts)
    .disable('code');

  // custom renderer rules
  const fence = mdLib.renderer.rules.fence;

  const rules = {
    fence: (tokens, idx, options, env, slf) => {
      const fenced = fence(tokens, idx, options, env, slf);
      return `<web-copy-code>${fenced}</web-copy-code>`;
    },
    table_close: () => '</table>\n</div>',
    table_open: () => '<div class="w-table-wrapper">\n<table>\n',
  };

  mdLib.renderer.rules = {...mdLib.renderer.rules, ...rules};

  config.setLibrary('md', mdLib);

  // ----------------------------------------------------------------------------
  // NON-11TY FILES TO WATCH
  // ----------------------------------------------------------------------------
  config.addWatchTarget('./src/site/content/en/**/*.yml');

  // ----------------------------------------------------------------------------
  // COLLECTIONS
  // ----------------------------------------------------------------------------
  config.addCollection('authors', authors);
  config.addCollection('blogPosts', blogPostsDescending);
  config.addCollection('newsletters', newsletters);
  config.addCollection('postToCollections', postToCollections);
  config.addCollection('postsWithLighthouse', postsWithLighthouse);
  config.addCollection('recentBlogPosts', recentBlogPosts);
  config.addCollection('tags', tags);
  // Turn collection.all into a lookup table so we can use findBySlug
  // to quickly find collection items without looping.
  config.addCollection('memoized', function(collection) {
    return memoize(collection.getAll());
  });
  config.addCollection('algolia', function(collection) {
    if (process.env.ELEVENTY_ENV === 'prod') {
      const algoliaPosts = require(`./${collectionsDir}/algolia-posts`);
      return algoliaPosts(collection);
    }
    return [];
  });

  // ----------------------------------------------------------------------------
  // FILTERS
  // ----------------------------------------------------------------------------
  config.addFilter('consoleDump', consoleDump);
  config.addFilter('findByUrl', findByUrl);
  config.addFilter('findTags', findTags);
  config.addFilter('pathSlug', pathSlug);
  config.addFilter('containsTag', containsTag);
  config.addFilter('expandContributors', expandContributors);
  config.addFilter('githubLink', githubLink);
  config.addFilter('gitlocalizeLink', gitlocalizeLink);
  config.addFilter('htmlDateString', htmlDateString);
  config.addFilter('md', md);
  config.addFilter('pagedNavigation', pagedNavigation);
  config.addFilter('postsLighthouseJson', postsLighthouseJson);
  config.addFilter('prettyDate', prettyDate);
  config.addFilter('removeDrafts', removeDrafts);
  config.addFilter('stripBlog', stripBlog);
  config.addFilter('stripLanguage', stripLanguage);
  config.addFilter('strip', strip);

  // ----------------------------------------------------------------------------
  // SHORTCODES
  // ----------------------------------------------------------------------------
  config.addShortcode('ArticleNavigation', ArticleNavigation);
  config.addPairedShortcode('Aside', Aside);
  config.addShortcode('Assessment', Assessment);
  config.addShortcode('Author', Author);
  config.addShortcode('AuthorCard', AuthorCard);
  config.addShortcode('AuthorInfo', AuthorInfo);
  config.addPairedShortcode('Banner', Banner);
  config.addPairedShortcode('Blockquote', Blockquote);
  config.addShortcode('Breadcrumbs', Breadcrumbs);
  config.addShortcode('CodelabsCallout', CodelabsCallout);
  config.addPairedShortcode('Compare', Compare);
  config.addPairedShortcode('CompareCaption', CompareCaption);
  config.addPairedShortcode('Details', Details);
  config.addPairedShortcode('DetailsSummary', DetailsSummary);
  config.addShortcode('Hero', Hero);
  config.addShortcode('Instruction', Instruction);
  config.addPairedShortcode('Label', Label);
  config.addShortcode('Meta', Meta);
  config.addShortcode('PathCard', PathCard);
  config.addShortcode('PostCard', PostCard);
  config.addShortcode('SignPosts', SignPosts);
  config.addShortcode('Tooltip', Tooltip);
  config.addShortcode('YouTube', YouTube);

  // This table is used for the web.dev/LIVE event, and should be taken down
  // when the event is over or we no longer use it.
  config.addShortcode('EventTable', EventTable);

  // ----------------------------------------------------------------------------
  // TRANSFORMS
  // ----------------------------------------------------------------------------
  if (process.env.PERCY) {
    config.addTransform('disable-lazy-load', disableLazyLoad);
  }

  if (process.env.ELEVENTY_ENV === 'prod') {
    config.addTransform('responsive-images', responsiveImages);
  }

  // !!! Important !!!
  // This transform should always go last.
  // It takes the final html and turns it into partials that the
  // service worker can load.
  config.addTransform('service-worker-partials', serviceWorkerPartials);

  // ----------------------------------------------------------------------------
  // ELEVENTY OPTIONS
  // ----------------------------------------------------------------------------
  // https://www.11ty.io/docs/config/#data-deep-merge
  config.setDataDeepMerge(true);

  // https://www.11ty.io/docs/config/#configuration-options
  return {
    dir: {
      input: 'src/site/content',
      output: 'dist',
      data: '../_data',
      includes: '../_includes',
    },
    templateFormats: ['njk', 'md'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
    // Because eleventy's passthroughFileCopy does not work with permalinks
    // we need to manually copy assets ourselves using gulp.
    // https://github.com/11ty/eleventy/issues/379
    passthroughFileCopy: false,
  };
};
