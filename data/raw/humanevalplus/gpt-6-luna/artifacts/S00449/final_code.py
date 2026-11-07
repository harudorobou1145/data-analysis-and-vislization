
def intersection(interval1, interval2):
    """Return whether the intersection's length is prime.

    Intervals are closed pairs (start, end), with start <= end. The length
    of an intersection is its right endpoint minus its left endpoint.
    """
    left = max(interval1[0], interval2[0])
    right = min(interval1[1], interval2[1])

    if left > right:
        return "NO"

    length = right - left
    if length < 2:
        return "NO"

    divisor = 2
    while divisor * divisor <= length:
        if length % divisor == 0:
            return "NO"
        divisor += 1
    return "YES"
