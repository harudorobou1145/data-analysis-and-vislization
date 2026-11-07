def count_up_to(n):
    """Return all prime integers strictly less than the non-negative integer n.

    Examples:
        count_up_to(5) == [2, 3]
        count_up_to(11) == [2, 3, 5, 7]
        count_up_to(0) == []
        count_up_to(20) == [2, 3, 5, 7, 11, 13, 17, 19]
    """
    if n <= 2:
        return []

    is_prime = [True] * n
    is_prime[0] = is_prime[1] = False
    candidate = 2
    while candidate * candidate < n:
        if is_prime[candidate]:
            for multiple in range(candidate * candidate, n, candidate):
                is_prime[multiple] = False
        candidate += 1

    return [number for number in range(2, n) if is_prime[number]]
