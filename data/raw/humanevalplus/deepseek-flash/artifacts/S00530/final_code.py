def f(n):
    """Return a list whose 1-based position ``i`` contains either the
    factorial of ``i`` (when ``i`` is even) or the sum 1 + ... + i
    (when ``i`` is odd).
    """
    result = []
    factorial = 1

    for i in range(1, n + 1):
        factorial *= i
        if i % 2 == 0:
            result.append(factorial)
        else:
            result.append(i * (i + 1) // 2)

    return result
