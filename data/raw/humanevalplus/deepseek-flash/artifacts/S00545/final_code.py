def fib(n: int):
    """Return n-th Fibonacci number.
    >>> fib(10)
    55
    >>> fib(1)
    1
    >>> fib(8)
    21
    """
    if n < 0:
        raise ValueError("Fibonacci number is undefined for negative indices")

    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
