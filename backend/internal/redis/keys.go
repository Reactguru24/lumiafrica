package redis

import "strconv"

const (
	keyPrefix = "lumi:"

	KeyProductFilters = keyPrefix + "products:filters"
	keyHomepagePrefix = keyPrefix + "homepage:"
)

// HomepageCacheKey builds the Redis key for a homepage collection response.
func HomepageCacheKey(collection string, limit int32) string {
	return homepageKey(collection, limit)
}

func homepageKey(collection string, limit int32) string {
	if collection == "" {
		collection = "all"
	}
	return keyHomepagePrefix + collection + ":" + strconv.FormatInt(int64(limit), 10)
}
