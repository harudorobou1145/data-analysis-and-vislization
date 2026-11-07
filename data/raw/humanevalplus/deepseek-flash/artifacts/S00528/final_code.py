def count_nums(arr):
    """
    Return the number of integers whose signed digit sum is greater than zero.

    For a negative number, only its first digit is negative. For example,
    -123 has signed digits -1, 2, and 3.

    >>> count_nums([])
    0
    >>> count_nums([-1, 11, -11])
    1
    >>> count_nums([1, 1, 2])
    3
    """
    count = 0

    for num in arr:
        digits = [int(digit) for digit in str(abs(num))]
        if num < 0:
            digits[0] = -digits[0]

        if sum(digits) > 0:
            count += 1

    return count
