/** Markdown links to reverse image search an image URL on Google, TinEye and Bing. */
function reverseSearchLinks(imageUrl) {
  const url = encodeURIComponent(imageUrl);
  return [
    `[\`[Google]\`](<https://lens.google.com/uploadbyurl?url=${url}>)`,
    `[\`[TinEye]\`](<https://www.tineye.com/search/?&url=${url}>)`,
    `[\`[Bing]\`](<https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${url}>)`,
  ].join(" ");
}

module.exports = { reverseSearchLinks };
