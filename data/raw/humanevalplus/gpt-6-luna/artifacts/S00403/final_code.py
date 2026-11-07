def count_up_to(n):
    """Return all prime numbers strictly less than the non-negative integer n.

    Examples:
        count_up_to(5)  -> [2, 3]
        count_up_to(11) -> [2, 3, 5, 7]
        count_up_to(0)  -> []
    """
    if n <= 2:
        return []

    # The sieve is indexed by each candidate integer from 0 through n - 1.
    is_prime = bytearray(b"\x01") * n
    is_prime[0:2] = b"\x00\x00"

    limit = int(n ** 0.5)
    for candidate in range(2, limit + 1):
        if is_prime[candidate]:
            start = candidate * candidate
            count = (n - 1 - start) // candidate + 1
            is_prime[start:n:candidate] = b"\x00" * count

    return [number for number in range(2, n) if is_prime[number]]
