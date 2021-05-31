import fetch from "../util/fetch-fill";
import URI from "urijs";

window.path = "http://localhost:3000/records";

const defaultPageSize = 10;
const nextPageExistsSize = defaultPageSize + 1;
const primaryColors = ["blue","red", "yellow"];
const otherColors = ["brown", "green"];
const supportedColors = primaryColors.concat(otherColors);

const retrieve = (options = {}) => {
  const userSpecifiedColors = userSpecified('colors', options);
  const userSpecifiedPage = userSpecified('page', options);
  const pageToRequest = userSpecifiedPage ? options.page : 1;
  const responseObject = {
    "previousPage": null,
    "nextPage": null,
    "ids": [],
    "open": [],
    "closedPrimaryCount": 0
  };

  return new Promise((resolve, _) => {
    let colorsToRequest = null;

    if (userSpecifiedColors) {
      // Ignore unsupported colors when building the request URL
      colorsToRequest = options.colors.filter(color => supportedColors.includes(color));
      const unsupportedColorRequest = colorsToRequest.length === 0;

      if (unsupportedColorRequest) {
        resolve(responseObject);
        return;
      }
    }

    const requestURL = buildURL(pageToRequest, colorsToRequest, defaultPageSize);

    getRecordsJSON(requestURL).then(records => {
      responseObject.previousPage = (pageToRequest === 1) ? null : pageToRequest - 1;

      if (records.length === 0) {
        resolve(responseObject);
        return;
      }

      /*
       * We want to return pages of N (default 10) records but we request N + 1
       * so that if we receive less than that we know we've exhausted the data
       */
      if (records.length === nextPageExistsSize) {
        responseObject.nextPage = pageToRequest + 1;
      }

      // Not using Array.forEach here since we only want to look at 10 records
      for (let i = 0; i < defaultPageSize; i++) {
        const record = records[i];
        const isOpenRecord = record.disposition === 'open';
        record.isPrimary = primaryColors.includes(record.color);
        const isClosedPrimaryRecord = record.isPrimary && !isOpenRecord;

        responseObject.ids.push(record.id);

        if (isClosedPrimaryRecord) {
          responseObject.closedPrimaryCount++;
        }

        if (isOpenRecord) {
          responseObject.open.push(record);
        }
      }

      resolve(responseObject);
      return;
    }).catch(error => {
      console.log(error);
      resolve([]);
      return;
    });
  });
};

const getRecordsJSON = async url => {
  const response = await fetch(url);
  // Handle HTTP code response outside the range 200-299
  if (!response.ok) {
    throw new Error(`API returned: ${response.status}`);
  }

  const records = await response.json();
  return records;
};

const userSpecified = (needle, haystack) => {
  return Object.keys(haystack).includes(needle);
};

const buildURL = (page, colors, defaultPageSize) => {
  const pageBasedOffset = (page - 1) * defaultPageSize;
  let requestURI = URI(window.path)
    .addQuery('limit', nextPageExistsSize)
    .addQuery('offset', pageBasedOffset);

  if (colors != null) {
    requestURI.addQuery('color[]', colors);
  }

  return requestURI;
};

export default retrieve;
