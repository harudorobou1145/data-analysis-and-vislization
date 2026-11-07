def solve(N):
    """Return the decimal digit sum of N as a binary string.

    Args:
        N: An integer satisfying 0 <= N <= 10000.

    Returns:
        The sum of N's decimal digits, represented in base 2.
    """
    digit_sum = sum(int(digit) for digit in str(N))
    return format(digit_sum, "b")
