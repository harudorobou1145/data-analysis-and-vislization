

def skjkasdkd(lst):
    """Return the sum of the digits of the largest prime in ``lst``.

    If the list contains no prime numbers, return 0.
    """
    def is_prime(n):
        if n < 2:
            return False
        if n % 2 == 0:
            return n == 2
        if n % 3 == 0:
            return n == 3
        divisor = 5
        while divisor * divisor <= n:
            if n % divisor == 0 or n % (divisor + 2) == 0:
                return False
            divisor += 6
        return True

    largest_prime = None
    for value in lst:
        if is_prime(value) and (largest_prime is None or value > largest_prime):
            largest_prime = value

    if largest_prime is None:
        return 0
    return sum(int(digit) for digit in str(largest_prime))
