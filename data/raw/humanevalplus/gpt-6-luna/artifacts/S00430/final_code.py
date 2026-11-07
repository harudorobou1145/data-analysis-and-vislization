def f(n):
    """Return a list whose 1-based element i is i! for even i and 1+...+i for odd i.

    Args:
        n: Number of elements to return.

    Returns:
        A list of length n (or an empty list when n is non-positive).
    """
    result = []
    factorial = 1
    triangular = 0

    for i in range(1, n + 1):
        factorial *= i
        triangular += i
        result.append(factorial if i % 2 == 0 else triangular)

    return result
