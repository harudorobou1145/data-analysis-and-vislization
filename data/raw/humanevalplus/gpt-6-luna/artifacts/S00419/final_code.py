def get_max_triples(n):
    """Count triples of array elements whose sum is divisible by 3.

    The array is defined by a[i] = i*i - i + 1 for 1 <= i <= n,
    and triples use indices i < j < k.
    """
    # Modulo 3, a[i] is 0 exactly when i == 2 (mod 3); all other
    # elements are 1 (mod 3). A triple sums to 0 only if all three
    # residues are 0 or all three are 1.
    zero_count = (n + 1) // 3
    one_count = n - zero_count

    def choose_three(count):
        return count * (count - 1) * (count - 2) // 6 if count >= 3 else 0

    return choose_three(zero_count) + choose_three(one_count)
