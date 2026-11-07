from functools import lru_cache


def fizz_buzz(n: int):
    """Return the number of times the digit 7 appears in integers less than n which are divisible by 11 or 13.
    >>> fizz_buzz(50)
    0
    >>> fizz_buzz(78)
    2
    >>> fizz_buzz(79)
    3
    """
    if n <= 0:
        return 0

    def count_for_divisor(divisor: int) -> int:
        """Count 7 digits among 0 <= x < n that are divisible by divisor."""
        digits = tuple(map(int, str(n - 1)))

        @lru_cache(maxsize=None)
        def dp(position: int, remainder: int, tight: bool):
            # Returns (number of valid completions, total number of 7 digits).
            if position == len(digits):
                return (1, 0) if remainder == 0 else (0, 0)

            upper = digits[position] if tight else 9
            total_count = 0
            total_sevens = 0

            for digit in range(upper + 1):
                next_tight = tight and digit == upper
                count, sevens = dp(
                    position + 1,
                    (remainder * 10 + digit) % divisor,
                    next_tight,
                )
                total_count += count
                total_sevens += sevens
                if digit == 7:
                    total_sevens += count

            return total_count, total_sevens

        return dp(0, 0, True)[1]

    # Inclusion-exclusion avoids counting multiples of both 11 and 13 twice.
    return (
        count_for_divisor(11)
        + count_for_divisor(13)
        - count_for_divisor(11 * 13)
    )
