from typing import List


def factorize(n: int) -> List[int]:
    """Return the prime factors of ``n`` in ascending order, with multiplicity.

    For example, ``factorize(8)`` returns ``[2, 2, 2]``. Values below 2
    have no prime factors and return an empty list.
    """
    factors: List[int] = []
    if n < 2:
        return factors

    divisor = 2
    while divisor <= n // divisor:
        while n % divisor == 0:
            factors.append(divisor)
            n //= divisor
        divisor += 1

    if n > 1:
        factors.append(n)
    return factors
