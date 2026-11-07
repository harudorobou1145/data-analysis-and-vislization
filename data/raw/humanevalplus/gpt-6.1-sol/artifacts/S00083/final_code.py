def count_nums(arr):
    """
    Write a function count_nums which takes an array of integers and returns
    the number of elements which has a sum of digits > 0.
    If a number is negative, then its first signed digit will be negative:
    e.g. -123 has signed digits -1, 2, and 3.
    >>> count_nums([]) == 0
    True
    >>> count_nums([-1, 11, -11]) == 1
    True
    >>> count_nums([1, 1, 2]) == 3
    True
    """
    count = 0
    for number in arr:
        digits = [int(digit) for digit in str(abs(number))]
        digit_sum = sum(digits)
        if number < 0:
            digit_sum -= 2 * digits[0]
        if digit_sum > 0:
            count += 1
    return count
